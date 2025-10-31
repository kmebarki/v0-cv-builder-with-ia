import { test, expect } from "@playwright/test"

const LOGIN_PATH = "/auth/login"
const SIGNUP_PATH = "/auth/signup"
const FORGOT_PATH = "/auth/forgot-password"

test.describe("Authentication UI", () => {
  test("affiche et gère les erreurs de connexion", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({ error: "Identifiants invalides." }),
        headers: { "Content-Type": "application/json" },
      })
    })

    await page.goto(LOGIN_PATH)
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible()

    await page.getByLabel("Email").fill("user@example.com")
    await page.getByLabel("Mot de passe").fill("wrong-password")
    await page.getByRole("button", { name: "Se connecter" }).click()

    await expect(page.getByText("Identifiants invalides.")).toBeVisible()
  })

  test("valide les contraintes du formulaire d'inscription", async ({ page }) => {
    await page.goto(SIGNUP_PATH)
    await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible()

    await page.getByLabel("Email").fill("nouveau@example.com")
    await page.getByLabel("Mot de passe").fill("Password123!")
    await page.getByLabel("Confirmation").fill("Password123!!")
    await page.getByRole("button", { name: "Créer un compte" }).click()

    await expect(page.getByText("Les mots de passe ne correspondent pas")).toBeVisible()
  })

  test("confirme l'envoi du reset password", async ({ page }) => {
    await page.route("**/api/auth/request-password-reset", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
        headers: { "Content-Type": "application/json" },
      })
    })

    await page.goto(FORGOT_PATH)
    await expect(page.getByRole("heading", { name: "Mot de passe oublié" })).toBeVisible()

    await page.getByLabel("Email").fill("user@example.com")
    await page.getByRole("button", { name: "Envoyer le lien" }).click()

    await expect(page.getByText("Si un compte existe, un email de réinitialisation a été envoyé.")).toBeVisible()
  })
})
