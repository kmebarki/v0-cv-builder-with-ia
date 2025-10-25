import * as Sentry from "@sentry/nextjs"
import { env } from "@/lib/env"

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    tracesSampleRate: 0.1,
  })
}
