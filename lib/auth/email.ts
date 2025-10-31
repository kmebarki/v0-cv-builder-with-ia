import nodemailer from "nodemailer"
import { env } from "@/lib/env"

const transport = env.email.smtpHost
  ? nodemailer.createTransport({
      host: env.email.smtpHost,
      port: env.email.smtpPort,
      secure: env.email.smtpSecure,
      auth:
        env.email.smtpUser && env.email.smtpPassword
          ? {
              user: env.email.smtpUser,
              pass: env.email.smtpPassword,
            }
          : undefined,
    })
  : null

async function sendEmail(subject: string, to: string, html: string) {
  if (!env.email.from) {
    console.warn("[auth] Aucun expéditeur configuré pour les emails, fallback console")
    console.info(`[email] ${subject} -> ${to}\n${html}`)
    return
  }

  if (!transport) {
    console.info(`[email] transport non configuré, sortie console: ${subject} -> ${to}\n${html}`)
    return
  }

  await transport.sendMail({
    from: env.email.from,
    to,
    subject,
    html,
  })
}

export async function sendVerificationEmail(params: { email: string; token: string }) {
  const verifyUrl = `${env.appUrl}/auth/verify-email?token=${encodeURIComponent(params.token)}`
  await sendEmail(
    "Vérifiez votre adresse email",
    params.email,
    `<p>Merci de créer un compte sur ${env.appName}. Cliquez sur le lien suivant pour vérifier votre adresse email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  )
}

export async function sendPasswordResetEmail(params: { email: string; token: string }) {
  const resetUrl = `${env.appUrl}/auth/reset-password?token=${encodeURIComponent(params.token)}`
  await sendEmail(
    "Réinitialisation de mot de passe",
    params.email,
    `<p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien suivant pour continuer:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  )
}

export async function sendTwoFactorEmail(params: { email: string; code: string }) {
  await sendEmail(
    "Code de connexion",
    params.email,
    `<p>Votre code de vérification est: <strong>${params.code}</strong></p>`
  )
}
