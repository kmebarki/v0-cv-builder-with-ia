interface CaptchaConfig {
  secretKey?: string
}

export async function verifyCaptcha(token: string | null | undefined, config: CaptchaConfig) {
  if (!config.secretKey) {
    // Captcha disabled - treat as success for development environments.
    return { success: true }
  }

  if (!token) {
    return { success: false, error: "Captcha manquant" }
  }

  try {
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: config.secretKey,
        response: token,
      }),
    })

    const data = (await response.json()) as { success: boolean; "error-codes"?: string[] }

    if (!data.success) {
      return { success: false, error: data["error-codes"]?.join(", ") ?? "Captcha invalide" }
    }

    return { success: true }
  } catch (error) {
    console.error("Erreur de vérification captcha", error)
    return { success: false, error: "Impossible de vérifier le captcha" }
  }
}
