"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SecuritySectionProps {
  initialTwoFactorEnabled: boolean
  emailVerified: boolean
}

export function SecuritySection({ initialTwoFactorEnabled, emailVerified }: SecuritySectionProps) {
  const [enabled, setEnabled] = useState(initialTwoFactorEnabled)
  const [secret, setSecret] = useState<string | null>(null)
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const resetState = () => {
    setSecret(null)
    setOtpauthUrl(null)
    setCode("")
  }

  const startTwoFactor = async () => {
    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      const response = await fetch("/api/auth/two-factor", { method: "POST" })
      const data = (await response.json()) as { secret?: string; otpauthUrl?: string; error?: string }

      if (!response.ok || !data.secret || !data.otpauthUrl) {
        setError(data.error ?? "Impossible de démarrer l'activation 2FA.")
        return
      }

      setSecret(data.secret)
      setOtpauthUrl(data.otpauthUrl)
      setInfo("Scannez le QR code ou saisissez la clé puis validez avec un code de votre application.")
    } catch (err) {
      console.error(err)
      setError("Erreur inattendue lors du démarrage de la 2FA.")
    } finally {
      setLoading(false)
    }
  }

  const confirmTwoFactor = async () => {
    if (!code) {
      setError("Saisissez le code généré par votre application d'authentification.")
      return
    }

    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      const response = await fetch("/api/auth/two-factor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !data.success) {
        setError(data.error ?? "Code invalide, veuillez réessayer.")
        return
      }

      setEnabled(true)
      setInfo("Double authentification activée avec succès.")
      resetState()
    } catch (err) {
      console.error(err)
      setError("Erreur inattendue pendant la validation du code.")
    } finally {
      setLoading(false)
    }
  }

  const disableTwoFactor = async () => {
    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      const response = await fetch("/api/auth/two-factor", { method: "DELETE" })
      const data = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !data.success) {
        setError(data.error ?? "Impossible de désactiver la double authentification.")
        return
      }

      setEnabled(false)
      resetState()
      setInfo("Double authentification désactivée.")
    } catch (err) {
      console.error(err)
      setError("Erreur inattendue lors de la désactivation.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sécurité du compte</CardTitle>
        <CardDescription>
          Activez la double authentification pour protéger votre compte contre les accès non autorisés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {info && !error && (
          <Alert>
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        )}

        {!emailVerified && (
          <Alert variant="warning">
            <AlertTitle>Email non vérifié</AlertTitle>
            <AlertDescription>
              Vérifiez votre adresse email avant d'activer la double authentification. Consultez votre boîte de réception
              pour le lien de confirmation.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Double authentification</p>
            <p className="text-sm text-muted-foreground">
              {enabled ? "Activée" : "Désactivée"}
            </p>
          </div>
          <div className="flex gap-2">
            {enabled ? (
              <Button variant="outline" className="bg-transparent" onClick={() => void disableTwoFactor()} disabled={loading}>
                Désactiver
              </Button>
            ) : (
              <Button onClick={() => void startTwoFactor()} disabled={loading || !emailVerified}>
                Activer
              </Button>
            )}
          </div>
        </div>

        {!enabled && secret && otpauthUrl && (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label>Clé secrète</Label>
              <Input value={secret} readOnly />
              <p className="text-xs text-muted-foreground">
                Ajoutez cette clé dans votre application d'authentification (Google Authenticator, Authy, 1Password…).
              </p>
            </div>
            <div className="space-y-1">
              <Label>URL OTP</Label>
              <Input value={otpauthUrl} readOnly />
              <p className="text-xs text-muted-foreground">
                Si votre application le permet, scannez l'URL ou copiez-la pour configurer automatiquement le compte.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Code à usage unique</Label>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={loading}
              />
              <Button onClick={() => void confirmTwoFactor()} disabled={loading}>
                Valider le code
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
