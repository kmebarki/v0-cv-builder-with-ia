export interface RateLimitOptions {
  windowMs: number
  max: number
}

interface RateBucket {
  count: number
  expiresAt: number
}

const buckets = new Map<string, RateBucket>()

export function hitRateLimit(key: string, options: RateLimitOptions): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.expiresAt < now) {
    buckets.set(key, {
      count: 1,
      expiresAt: now + options.windowMs,
    })
    return false
  }

  bucket.count += 1

  if (bucket.count > options.max) {
    return true
  }

  buckets.set(key, bucket)
  return false
}

export function resetRateLimit(key: string) {
  buckets.delete(key)
}
