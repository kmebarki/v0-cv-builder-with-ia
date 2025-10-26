export function parseNumeric(value?: number | string) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number.parseFloat(trimmed)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}
