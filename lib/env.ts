const parseBoolean = (value: string | undefined, defaultValue = false) => {
  if (value === undefined) return defaultValue
  return ["1", "true", "yes", "on"].includes(value.toLowerCase())
}

const parseNumber = (value: string | undefined, defaultValue: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

export const env = {
  appName: process.env.APP_NAME ?? "v0 CV Builder",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL ?? "",
  betterAuth: {
    secret: process.env.BETTERAUTH_SECRET ?? "",
    sessionCookieName: process.env.BETTERAUTH_SESSION_COOKIE ?? "betterauth.session-token",
    sessionMaxAgeMs: parseNumber(process.env.BETTERAUTH_SESSION_MAX_AGE_MS, 1000 * 60 * 60 * 24 * 7),
    sessionRotationMs: parseNumber(process.env.BETTERAUTH_SESSION_ROTATION_MS, 1000 * 60 * 60 * 6),
  },
  email: {
    from: process.env.BETTERAUTH_EMAIL_FROM ?? "",
    smtpHost: process.env.SMTP_HOST ?? "",
    smtpPort: parseNumber(process.env.SMTP_PORT, 587),
    smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
    smtpUser: process.env.SMTP_USERNAME ?? "",
    smtpPassword: process.env.SMTP_PASSWORD ?? "",
  },
  oauth: {
    google: {
      enabled: parseBoolean(process.env.BETTERAUTH_GOOGLE_ENABLED, false),
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    github: {
      enabled: parseBoolean(process.env.BETTERAUTH_GITHUB_ENABLED, false),
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
  },
  captcha: {
    secretKey: process.env.HCAPTCHA_SECRET_KEY ?? "",
  },
  auth: {
    registerRateLimit: parseNumber(process.env.AUTH_REGISTER_MAX, 5),
    registerWindowMs: parseNumber(process.env.AUTH_REGISTER_WINDOW_MS, 1000 * 60 * 10),
    loginRateLimit: parseNumber(process.env.AUTH_LOGIN_MAX, 10),
    loginWindowMs: parseNumber(process.env.AUTH_LOGIN_WINDOW_MS, 1000 * 60 * 5),
    passwordPolicy: {
      minLength: parseNumber(process.env.AUTH_PASSWORD_MIN_LENGTH, 12),
      requireUppercase: parseBoolean(process.env.AUTH_PASSWORD_REQUIRE_UPPERCASE, true),
      requireLowercase: parseBoolean(process.env.AUTH_PASSWORD_REQUIRE_LOWERCASE, true),
      requireNumber: parseBoolean(process.env.AUTH_PASSWORD_REQUIRE_NUMBER, true),
      requireSpecial: parseBoolean(process.env.AUTH_PASSWORD_REQUIRE_SPECIAL, true),
    },
  },
  admin: {
    email: process.env.ADMIN_EMAIL ?? "",
    password: process.env.ADMIN_PASSWORD ?? "",
  },
  sentryDsn: process.env.SENTRY_DSN ?? "",
} as const

export function validateEnv() {
  const missing: string[] = []

  if (!env.databaseUrl) missing.push("DATABASE_URL")
  if (!env.betterAuth.secret) missing.push("BETTERAUTH_SECRET")

  if (env.oauth.google.enabled) {
    if (!env.oauth.google.clientId) missing.push("GOOGLE_CLIENT_ID")
    if (!env.oauth.google.clientSecret) missing.push("GOOGLE_CLIENT_SECRET")
  }

  if (env.oauth.github.enabled) {
    if (!env.oauth.github.clientId) missing.push("GITHUB_CLIENT_ID")
    if (!env.oauth.github.clientSecret) missing.push("GITHUB_CLIENT_SECRET")
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }

  if (!env.admin.email || !env.admin.password) {
    console.warn(
      "[env] ADMIN_EMAIL ou ADMIN_PASSWORD non défini(s) - le script de seed créera uniquement les rôles.",
    )
  }

  return true
}
