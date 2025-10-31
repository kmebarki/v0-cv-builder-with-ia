"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Icons } from "@/components/icons"

interface OAuthProviderButton {
  id: string
  name: string
  enabled: boolean
}

interface LoginFormProps {
  providers: OAuthProviderButton[]
  initialError?: string
}

interface LoginResponse {
  success?: boolean
  user?: { id: string }
  error?: string
  requiresTwoFactor?: boolean
}

export function LoginForm({ providers, initialError }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [info, setInfo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          twoFactorCode: requiresTwoFactor ? twoFactorCode : undefined,
        }),
      })

      const data = (await response.json()) as LoginResponse

      if (response.status === 202 && data.requiresTwoFactor) {
        setRequiresTwoFactor(true)
        setInfo("Un code de vérification a été envoyé à votre adresse email.")
        return
      }

      if (!response.ok || !data.success) {
        setError(data.error ?? "Impossible de se connecter")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      console.error(err)
      setError("Erreur inattendue, veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuth = async (provider: OAuthProviderButton) => {
    if (!provider.enabled) {
      setError("Ce fournisseur OAuth n'est pas configuré.")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/auth/oauth/${provider.id}`, {
        method: "POST",
      })

      if (response.ok) {
        const { url, message } = (await response.json()) as { url?: string; message?: string }
        if (url) {
          window.location.href = url
        } else if (message) {
          setInfo(message)
        } else {
          setError("Flux OAuth démarré, veuillez suivre les instructions envoyées.")
        }
      } else {
        const data = (await response.json()) as { error?: string }
        setError(data.error ?? "Impossible de démarrer l'authentification externe.")
      }
    } catch (err) {
      console.error(err)
      setError("Erreur inattendue pendant la redirection OAuth")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Connexion</CardTitle>
            <CardDescription>Entrez vos identifiants pour accéder à votre compte</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Connexion impossible</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {info && !error && (
                <Alert>
                  <AlertTitle>Action requise</AlertTitle>
                  <AlertDescription>{info}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading}
                />
              </div>

              {requiresTwoFactor && (
                <div className="grid gap-2">
                  <Label htmlFor="twoFactor">Code de vérification</Label>
                  <Input
                    id="twoFactor"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value)}
                    disabled={isLoading}
                    placeholder="123456"
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>

              <div className="text-center text-sm">
                <Link href="/auth/forgot-password" className="underline underline-offset-4">
                  Mot de passe oublié ?
                </Link>
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-center text-xs uppercase text-muted-foreground">ou continuez avec</p>
                <div className="grid gap-3">
                  {providers.map((provider) => {
                    const IconComponent = Icons[provider.id as keyof typeof Icons] ?? Icons.globe
                    return (
                      <Button
                        key={provider.id}
                        type="button"
                        variant="outline"
                        className="w-full bg-transparent"
                        disabled={isLoading}
                        onClick={() => void handleOAuth(provider)}
                      >
                        {typeof IconComponent === "function" && (
                          <IconComponent className="mr-2 h-4 w-4" />
                        )}
                        {provider.enabled ? provider.name : `${provider.name} (désactivé)`}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 text-center text-sm">
                Pas encore de compte ?{' '}
                <Link href="/auth/signup" className="underline underline-offset-4">
                  Créer un compte
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
