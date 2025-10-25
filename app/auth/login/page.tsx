import { LoginForm } from "@/components/auth/login-form"
import { env } from "@/lib/env"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ oauthError?: string }>
}) {
  const params = await searchParams
  const providers = [
    { id: "google", name: "Google", enabled: env.oauth.google.enabled },
    { id: "github", name: "GitHub", enabled: env.oauth.github.enabled },
  ]

  return <LoginForm providers={providers} initialError={params?.oauthError} />
}
