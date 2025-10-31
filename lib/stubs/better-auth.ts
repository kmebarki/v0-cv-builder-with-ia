import { randomBytes } from "crypto"
import argon2 from "argon2"
import { nanoid } from "nanoid"
import { TOTP } from "otpauth"
import { type BetterAuthPrismaAdapter } from "./better-auth-prisma-adapter"
import { env } from "@/lib/env"
import { prisma } from "@/lib/prisma"
import { validatePassword } from "@/lib/security/password-policy"
import { hitRateLimit, resetRateLimit } from "@/lib/security/rate-limiter"
import { verifyCaptcha } from "@/lib/security/captcha"
import {
  sendPasswordResetEmail,
  sendTwoFactorEmail,
  sendVerificationEmail,
} from "@/lib/auth/email"
import { captureAuthException, captureAuthMessage } from "@/lib/observability/sentry"
import { UAParser } from "ua-parser-js"
import type { Authenticator, Session, User } from "@prisma/client"

export interface BetterAuthRequestContext {
  ipAddress?: string | null
  userAgent?: string | null
  captchaToken?: string | null
  cookieWriter?: (cookie: SessionCookie) => void
}

export interface BetterAuthUser extends Omit<User, "passwordHash"> {
  roles: string[]
}

export interface SessionCookie {
  name: string
  value: string
  options: {
    httpOnly: boolean
    secure: boolean
    sameSite: "lax" | "strict"
    maxAge: number
    path: string
  }
}

export interface BetterAuthLoginParams {
  email: string
  password: string
  twoFactorCode?: string
}

export interface BetterAuthRegisterParams {
  email: string
  password: string
  firstName?: string
  lastName?: string
  autoLogin?: boolean
}

export interface BetterAuthPasswordResetParams {
  token: string
  password: string
}

export interface BetterAuthTwoFactorSetupResult {
  secret: string
  otpauthUrl: string
}

export interface BetterAuthSessionResult {
  session: Session
  user: BetterAuthUser
  cookie: SessionCookie
}

export interface BetterAuthResult<T = void> {
  success: boolean
  error?: string
  data?: T
  code?: string
}

export interface BetterAuthOptions {
  secret: string
  adapter: BetterAuthPrismaAdapter
}

const SESSION_COOKIE_DEFAULT: SessionCookie = {
  name: env.betterAuth.sessionCookieName,
  value: "",
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: Math.floor(env.betterAuth.sessionMaxAgeMs / 1000),
    path: "/",
  },
}

const REGISTER_RATE_LIMIT_KEY = "betterauth:register"
const LOGIN_RATE_LIMIT_KEY = "betterauth:login"
const AUTHENTICATOR_LABEL = "Authenticator"

// --- Helper pour forcer un string de session token ---
// Accepte string, { token: string }, ou toute autre forme → renvoie string ou null
function normalizeSessionToken(input: unknown): string | null {
  if (!input) return null
  if (typeof input === "string") return input
  if (typeof input === "object" && input !== null && "token" in input) {
    const v = (input as { token?: unknown }).token
    return typeof v === "string" ? v : null
  }
  return null
}


export class BetterAuthServer {
  constructor(private readonly options: BetterAuthOptions) {}

  private sanitizeUser(user: User & { roles: { role: { name: string } }[] }): BetterAuthUser {
    const { passwordHash: _passwordHash, ...rest } = user
    return {
      ...rest,
      roles: user.roles.map((r) => r.role.name),
    }
  }

  private async createSession(
    userId: string,
    context: BetterAuthRequestContext,
    existingSession?: Session,
  ): Promise<BetterAuthSessionResult> {
    const token = nanoid(64)
    const refreshToken = nanoid(64)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + env.betterAuth.sessionMaxAgeMs)

    if (existingSession) {
      await prisma.session.delete({ where: { id: existingSession.id } })
    }

    const session = await prisma.session.create({
      data: {
        userId,
        sessionToken: token,
        refreshToken,
        expiresAt,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        rotatedAt: new Date(),
      },
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    })

    if (!user) {
      throw new Error("Utilisateur introuvable après la création de session")
    }

    const cookie = {
      ...SESSION_COOKIE_DEFAULT,
      value: token,
    }
    if (context.cookieWriter) {
      context.cookieWriter(cookie)
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "session.created",
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
    })

    await this.trackEvent("session.created", "success", {
      ...context,
      userId,
    })

    return {
      session,
      user: this.sanitizeUser(user),
      cookie,
    }
  }

  async register(params: BetterAuthRegisterParams, context: BetterAuthRequestContext): Promise<BetterAuthResult<{ user: BetterAuthUser }>> {
    if (hitRateLimit(`${REGISTER_RATE_LIMIT_KEY}:${context.ipAddress ?? "global"}`, {
      max: env.auth.registerRateLimit,
      windowMs: env.auth.registerWindowMs,
    })) {
      captureAuthMessage("Rate limit register", { ip: context.ipAddress ?? "unknown" })
      await this.trackEvent("register", "blocked", {
        ...context,
        reason: "rate_limited",
      })
      return { success: false, error: "Trop de tentatives, réessayez plus tard." }
    }

    const passwordValidation = validatePassword(params.password, env.auth.passwordPolicy)
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors.join(" ") }
    }

    const captchaResult = await verifyCaptcha(context.captchaToken, env.captcha)
    if (!captchaResult.success) {
      return { success: false, error: captchaResult.error ?? "Captcha requis" }
    }

    const existingUser = await prisma.user.findUnique({ where: { email: params.email.toLowerCase() } })
    if (existingUser) {
      await this.trackEvent("register", "failure", {
        ...context,
        userId: existingUser.id,
        reason: "email_exists",
      })
      return { success: false, error: "Un compte existe déjà avec cet email." }
    }

    const hashedPassword = await argon2.hash(params.password, { type: argon2.argon2id })

    const user = await prisma.user.create({
      data: {
        email: params.email.toLowerCase(),
        passwordHash: hashedPassword,
        firstName: params.firstName,
        lastName: params.lastName,
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "user" },
                create: { name: "user", description: "Utilisateur standard" },
              },
            },
          },
        },
      },
      include: { roles: { include: { role: true } } },
    })

    const verificationToken = await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: nanoid(48),
        type: "EMAIL_VERIFICATION",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        userId: user.id,
      },
    })

    await sendVerificationEmail({ email: user.email, token: verificationToken.token })

    await this.trackEvent("register", "success", {
      ...context,
      userId: user.id,
    })

    resetRateLimit(`${REGISTER_RATE_LIMIT_KEY}:${context.ipAddress ?? "global"}`)

    if (params.autoLogin) {
      const session = await this.createSession(user.id, context)
      return { success: true, data: { user: session.user } }
    }

    return { success: true, data: { user: this.sanitizeUser(user) } }
  }

  async verifyEmail(token: string): Promise<BetterAuthResult> {
    const storedToken = await prisma.verificationToken.findFirst({
      where: { token, type: "EMAIL_VERIFICATION" },
    })

    if (!storedToken || storedToken.expiresAt < new Date()) {
      await this.trackEvent("email.verify", "failure", {
        reason: "invalid_or_expired",
      })
      return { success: false, error: "Lien de vérification invalide ou expiré." }
    }
    if (!storedToken.userId) {
     captureAuthMessage("email.verify.missing_userId", { tokenId: storedToken.id })
     return { success: false, error: "Vérification impossible : utilisateur inconnu." }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: storedToken.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.verificationToken.delete({ where: { id: storedToken.id } }),
    ])

    await this.trackEvent("email.verify", "success", {
      userId: storedToken.userId ?? undefined,
    })

    return { success: true }
  }

  async requestPasswordReset(email: string, context: BetterAuthRequestContext): Promise<BetterAuthResult> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) {
      return { success: true }
    }

    const token = await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: nanoid(48),
        type: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        userId: user.id,
      },
    })

    await sendPasswordResetEmail({ email: user.email, token: token.token })

    await this.trackEvent("password.reset.request", "success", {
      ...context,
      userId: user.id,
    })

    return { success: true }
  }

  async resetPassword(params: BetterAuthPasswordResetParams): Promise<BetterAuthResult> {
    const token = await prisma.verificationToken.findFirst({
      where: { token: params.token, type: "PASSWORD_RESET" },
    })

    if (!token || token.expiresAt < new Date()) {
      await this.trackEvent("password.reset", "failure", {
        reason: "invalid_or_expired",
      })
      return { success: false, error: "Lien de réinitialisation invalide ou expiré." }
    }
    if (!token.userId) {
      captureAuthMessage("password.reset.missing_userId", { tokenId: token?.id })
      return { success: false, error: "Réinitialisation impossible : utilisateur inconnu." }
    }

    const passwordValidation = validatePassword(params.password, env.auth.passwordPolicy)
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors.join(" ") }
    }

    const hashedPassword = await argon2.hash(params.password, { type: argon2.argon2id })

    await prisma.$transaction([
      prisma.user.update({ where: { id: token.userId }, data: { passwordHash: hashedPassword } }),
      prisma.verificationToken.delete({ where: { id: token.id } }),
      prisma.session.deleteMany({ where: { userId: token.userId } }),
    ])

    await this.trackEvent("password.reset", "success", {
      userId: token.userId ?? undefined,
    })

    return { success: true }
  }

  private async handleTwoFactorOnLogin(
    user: User,
    params: BetterAuthLoginParams,
    context: BetterAuthRequestContext,
  ): Promise<BetterAuthResult<{ requiresTwoFactor: boolean }>> {
    const authenticators = await prisma.authenticator.findMany({
      where: { userId: user.id, isPrimary: true },
      orderBy: { createdAt: "asc" },
    })

    if (authenticators.length === 0) {
      return { success: true, data: { requiresTwoFactor: false } }
    }

    const primary = authenticators[0]

    if (!params.twoFactorCode) {
      if (user.email) {
        await prisma.verificationToken.deleteMany({
          where: { userId: user.id, type: "TWO_FACTOR" },
        })
        const fallbackCode = (Math.floor(Math.random() * 900000) + 100000).toString()
        await sendTwoFactorEmail({ email: user.email, code: fallbackCode })
        await prisma.verificationToken.create({
          data: {
            identifier: user.email,
            token: fallbackCode,
            type: "TWO_FACTOR",
            expiresAt: new Date(Date.now() + 1000 * 60 * 10),
            userId: user.id,
          },
        })
        await this.trackEvent("two_factor.challenge", "issued", {
          ...context,
          userId: user.id,
        })
      }
      return { success: false, data: { requiresTwoFactor: true }, code: "two_factor_required" }
    }

    const totp = new TOTP({
      issuer: env.appName,
      label: user.email ?? user.id,
      secret: primary.secret,
    })

    let usedFallback = false
    const isValid = totp.validate({ token: params.twoFactorCode, window: 1 })
    if (!isValid) {
      const fallbackToken = await prisma.verificationToken.findFirst({
        where: {
          identifier: user.email ?? user.id,
          token: params.twoFactorCode,
          type: "TWO_FACTOR",
        },
      })

      if (!fallbackToken || fallbackToken.expiresAt < new Date()) {
        await this.trackEvent("two_factor.verify", "failure", {
          ...context,
          userId: user.id,
          reason: "invalid_token",
        })
        return { success: false, error: "Code de vérification invalide." }
      }

      await prisma.verificationToken.delete({ where: { id: fallbackToken.id } })
      usedFallback = true
    }

    await prisma.authenticator.update({
      where: { id: primary.id },
      data: { lastUsedAt: new Date(), counter: primary.counter + 1 },
    })

    await this.trackEvent("two_factor.verify", "success", {
      ...context,
      userId: user.id,
      reason: usedFallback ? "fallback_code" : "totp",
    })

    return { success: true, data: { requiresTwoFactor: false } }
  }

  async login(
    params: BetterAuthLoginParams,
    context: BetterAuthRequestContext,
  ): Promise<BetterAuthResult<BetterAuthSessionResult>> {
    if (hitRateLimit(`${LOGIN_RATE_LIMIT_KEY}:${context.ipAddress ?? "global"}`, {
      max: env.auth.loginRateLimit,
      windowMs: env.auth.loginWindowMs,
    })) {
      captureAuthMessage("Rate limit login", { ip: context.ipAddress ?? "unknown" })
      await this.trackEvent("login", "blocked", {
        ...context,
        reason: "rate_limited",
      })
      return { success: false, error: "Trop de tentatives, réessayez plus tard." }
    }

    let user: (User & { roles: { role: { name: string } }[] }) | null = null
    try {
      user = await prisma.user.findUnique({
        where: { email: params.email.toLowerCase() },
        include: { roles: { include: { role: true } } },
      })
    } catch (e) {
      // DB down / Prisma init error
      captureAuthException(e, { scope: "auth.login.findUser" })
      return { success: false, error: "Service d’authentification indisponible. Réessayez plus tard." }
    }

    if (!user || !user.passwordHash) {
      captureAuthMessage("Login failed", { reason: "user_not_found", email: params.email })
      await this.trackEvent("login", "failure", {
        ...context,
        reason: "user_not_found",
      })
      return { success: false, error: "Identifiants invalides." }
    }

    const passwordMatch = await argon2.verify(user.passwordHash, params.password)
    if (!passwordMatch) {
      await this.trackEvent("login", "failure", {
        ...context,
        userId: user.id,
        reason: "invalid_password",
      })
      // laisser un message générique côté client, mais tracer en interne
      captureAuthMessage("login.invalid_password", { userId: user.id })
      return { success: false, error: "Identifiants invalides." }
    }

    if (!user.emailVerifiedAt) {
      const token = await prisma.verificationToken.create({
        data: {
          identifier: user.email,
          token: nanoid(48),
          type: "EMAIL_VERIFICATION",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
          userId: user.id,
        },
      })
      await sendVerificationEmail({ email: user.email ?? "", token: token.token })
      await this.trackEvent("login", "blocked", {
        ...context,
        userId: user.id,
        reason: "email_not_verified",
      })
      return {
        success: false,
        error: "Votre email doit être vérifié pour continuer.",
        code: "email_not_verified",
      }
    }

    const twoFactor = await this.handleTwoFactorOnLogin(user, params, context)
    if (!twoFactor.success) {
      if (twoFactor.code === "two_factor_required") {
        await this.trackEvent("login", "challenge", {
          ...context,
          userId: user.id,
          reason: "two_factor_required",
        })
      }
      return twoFactor as BetterAuthResult<BetterAuthSessionResult>
    }

    const sessionResult = await this.createSession(user.id, context)

    await this.trackEvent("login", "success", {
      ...context,
      userId: user.id,
    })

    resetRateLimit(`${LOGIN_RATE_LIMIT_KEY}:${context.ipAddress ?? "global"}`)

    return {
      success: true,
      data: sessionResult,
    }
  }

  async logout(context: BetterAuthRequestContext, sessionToken?: string) {
   const normalized = normalizeSessionToken(sessionToken as unknown)
   if (!normalized) return { success: true }
   const session = await prisma.session.findUnique({ where: { sessionToken: normalized } })
   await prisma.session.deleteMany({ where: { sessionToken: normalized } })
  if (context.cookieWriter) {
    context.cookieWriter({
      ...SESSION_COOKIE_DEFAULT,
      value: "",
      options: { ...SESSION_COOKIE_DEFAULT.options, maxAge: 0 },
    })
  }

  if (session) {
    await this.trackEvent("logout", "success", {
      ...context,
      userId: session.userId,
    })
  }

  return { success: true }
}

  async getSession(token: string | undefined | null, context: BetterAuthRequestContext): Promise<BetterAuthResult<BetterAuthSessionResult>> {
   const sessionToken = normalizeSessionToken(token)
   if (!sessionToken) {
     return { success: false, error: "Session manquante" }
   }
   let session: Session | null = null
   try {
     session = await prisma.session.findUnique({ where: { sessionToken: sessionToken } })
   } catch (e) {
     captureAuthException(e, { scope: "auth.getSession.findSession" })
     return { success: false, error: "Service de session indisponible. Réessayez plus tard." }
   }

  if (!session) {
    return { success: false, error: "Session introuvable" }
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } })
    return { success: false, error: "Session expirée" }
  }

  let rotateSession = false
  if (env.betterAuth.sessionRotationMs > 0 && session.rotatedAt) {
    const nextRotation = new Date(session.rotatedAt.getTime() + env.betterAuth.sessionRotationMs)
    rotateSession = nextRotation < new Date()
  } else if (env.betterAuth.sessionRotationMs > 0 && !session.rotatedAt) {
    const createdAt = session.createdAt ?? new Date(0)
    rotateSession = createdAt.getTime() + env.betterAuth.sessionRotationMs < Date.now()
  }

  if (rotateSession) {
    const result = await this.createSession(session.userId, context, session)
    await this.trackEvent("session.rotated", "success", {
      ...context,
      userId: session.userId,
    })
    return {
      success: true,
      data: result,
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { roles: { include: { role: true } } },
  })

  if (!user) {
    await prisma.session.delete({ where: { id: session.id } })
    return { success: false, error: "Utilisateur introuvable" }
  }

  return {
    success: true,
    data: {
      session,
      user: this.sanitizeUser(user),
      cookie: {
        ...SESSION_COOKIE_DEFAULT,
        value: sessionToken,
      },
    },
  }
}


  async enableTwoFactor(
    userId: string,
    context: BetterAuthRequestContext = {},
  ): Promise<BetterAuthResult<BetterAuthTwoFactorSetupResult>> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, error: "Utilisateur introuvable" }
    }

    const secret = randomBytes(20).toString("hex")
    const totp = new TOTP({
      issuer: env.appName,
      label: user.email ?? user.id,
      secret,
    })

    await prisma.authenticator.upsert({
      where: { userId_label: { userId: user.id, label: AUTHENTICATOR_LABEL } },
      create: {
        userId: user.id,
        secret,
        isPrimary: false,
        label: AUTHENTICATOR_LABEL,
      },
      update: {
        secret,
        isPrimary: false,
        counter: 0,
        lastUsedAt: null,
      },
    })

    await this.trackEvent("two_factor.setup", "started", {
      ...context,
      userId: user.id,
    })

    return {
      success: true,
      data: {
        secret,
        otpauthUrl: totp.toString(),
      },
    }
  }

  async verifyTwoFactorSetup(
    userId: string,
    code: string,
    context: BetterAuthRequestContext,
  ): Promise<BetterAuthResult> {
    const authenticator = await prisma.authenticator.findUnique({
      where: { userId_label: { userId, label: AUTHENTICATOR_LABEL } },
    })

    if (!authenticator) {
      return { success: false, error: "Aucune configuration 2FA en attente." }
    }

    const totp = new TOTP({
      issuer: env.appName,
      label: authenticator.label ?? userId,
      secret: authenticator.secret,
    })

    const isValid = totp.validate({ token: code, window: 1 })
    if (!isValid) {
      await this.trackEvent("two_factor.setup", "failure", {
        ...context,
        userId,
        reason: "invalid_code",
      })
      return { success: false, error: "Code de vérification invalide." }
    }

    await prisma.authenticator.update({
      where: { id: authenticator.id },
      data: { isPrimary: true, lastUsedAt: new Date(), counter: authenticator.counter + 1 },
    })

    await prisma.verificationToken.deleteMany({
      where: { userId, type: "TWO_FACTOR" },
    })

    await this.trackEvent("two_factor.setup", "success", {
      ...context,
      userId,
    })

    return { success: true }
  }

  async disableTwoFactor(
    userId: string,
    context: BetterAuthRequestContext = {},
  ): Promise<BetterAuthResult> {
    await prisma.authenticator.deleteMany({ where: { userId } })
    await prisma.verificationToken.deleteMany({ where: { userId, type: "TWO_FACTOR" } })

    await this.trackEvent("two_factor.disable", "success", {
      ...context,
      userId,
    })

    return { success: true }
  }

  async createSessionForUser(
    userId: string,
    context: BetterAuthRequestContext,
  ): Promise<BetterAuthResult<BetterAuthSessionResult>> {
    try {
      const session = await this.createSession(userId, context)
      return { success: true, data: session }
    } catch (error) {
      captureAuthException(error, { userId })
      return { success: false, error: "Impossible de créer la session" }
    }
  }

  async getRoles(userId: string) {
    const roles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    })
    return roles.map((r) => r.role.name)
  }

  async requireRole(userId: string, roles: string[]): Promise<BetterAuthResult> {
    const userRoles = await this.getRoles(userId)
    if (roles.some((role) => userRoles.includes(role))) {
      return { success: true }
    }

    return { success: false, error: "Accès refusé" }
  }

  async trackEvent(event: string, status: string, context: BetterAuthRequestContext & { userId?: string; reason?: string }) {
    try {
      await prisma.authEvent.create({
        data: {
          userId: context.userId ?? null,
          event,
          status,
          reason: context.reason ?? null,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        },
      })

      if (status !== "success") {
        captureAuthMessage(`auth.${event}.${status}`, {
          userId: context.userId ?? "anonymous",
          reason: context.reason ?? "",
          ip: context.ipAddress ?? "",
        })
      }
    } catch (error) {
      captureAuthException(error, { event, status })
    }
  }
}

export function betterAuth(options: BetterAuthOptions) {
  return new BetterAuthServer(options)
}

export function parseUserAgent(userAgent: string | undefined | null) {
  const parser = new UAParser(userAgent ?? undefined)
  const result = parser.getResult()
  return {
    browser: result.browser.name,
    os: result.os.name,
    device: result.device.model,
  }
}
