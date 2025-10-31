export function resolveCollection(data, path, options = {}) {
  if (!data || !path) return []

  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1")
  const parts = normalizedPath.split(".").filter(Boolean)

  let current = data
  for (const part of parts) {
    if (current == null) break
    if (Array.isArray(current)) {
      const index = Number.parseInt(part, 10)
      current = Number.isNaN(index) ? undefined : current[index]
    } else if (typeof current === "object") {
      current = current[part]
    } else {
      current = undefined
    }
  }

  const limit = options.maxItems

  if (Array.isArray(current)) {
    return limit ? current.slice(0, limit) : current
  }

  if (current && typeof current === "object") {
    const entries = Object.entries(current).map(([key, value]) =>
      value && typeof value === "object" ? { key, ...value } : { key, value },
    )
    return limit ? entries.slice(0, limit) : entries
  }

  return []
}
