export interface PasswordPolicyResult {
  valid: boolean
  errors: string[]
}

export interface PasswordPolicyConfig {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumber: boolean
  requireSpecial: boolean
}

export function validatePassword(password: string, config: PasswordPolicyConfig): PasswordPolicyResult {
  const errors: string[] = []

  if (password.length < config.minLength) {
    errors.push(`Le mot de passe doit contenir au moins ${config.minLength} caractères.`)
  }

  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre majuscule.")
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre minuscule.")
  }

  if (config.requireNumber && !/[0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre.")
  }

  if (config.requireSpecial && !/[\W_]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial.")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
