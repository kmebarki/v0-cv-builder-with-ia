"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AdminFieldRuntimeSnapshot } from "@/lib/editor/admin-field-runtime"
import { createAjv } from "@/lib/editor/ajv-lite"

interface UseAdminRuntimeResult {
  runtime: AdminFieldRuntimeSnapshot
  validate: (payload: Record<string, any>) => { success: boolean; errors: string[] }
}

function formatErrors(errors: { instancePath: string; message: string }[] | null | undefined) {
  if (!errors || errors.length === 0) {
    return []
  }
  return errors.map((error) => `${error.instancePath || "/"} ${error.message}`.trim())
}

export function useAdminFieldRuntime(initial: AdminFieldRuntimeSnapshot): UseAdminRuntimeResult {
  const [runtime, setRuntime] = useState<AdminFieldRuntimeSnapshot>(initial)
  const versionRef = useRef(initial?.version ?? 0)
  const reconnectRef = useRef<number>()

  useEffect(() => {
    if (!initial) return
    setRuntime(initial)
    versionRef.current = initial.version
  }, [initial])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let cancelled = false
    let source: EventSource | null = null

    const connect = () => {
      if (cancelled) return
      source = new EventSource("/api/admin-fields/runtime/stream")

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as AdminFieldRuntimeSnapshot
          if (payload.version && payload.version !== versionRef.current) {
            versionRef.current = payload.version
            setRuntime(payload)
          }
        } catch (error) {
          console.warn("[admin-runtime] unable to parse event", error)
        }
      }

      source.onerror = () => {
        source?.close()
        if (cancelled) return
        reconnectRef.current = window.setTimeout(connect, 4000)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current)
      }
      source?.close()
    }
  }, [])

  const validator = useMemo(() => {
    const ajv = createAjv({ allErrors: true, coerceTypes: true })
    return ajv.compile(runtime.schema)
  }, [runtime.schema])

  const validate = useCallback(
    (payload: Record<string, any>) => {
      const success = validator(payload ?? {})
      const errors = formatErrors(validator.errors as any)
      return { success, errors }
    },
    [validator],
  )

  return { runtime, validate }
}
