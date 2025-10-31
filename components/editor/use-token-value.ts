"use client"

import { useMemo } from "react"
import { useTemplateEditor } from "@/components/editor/editor-context"
import { resolveTokenReference } from "@/lib/editor/token-resolver"

export function useTokenValue<T = any>(ref?: string, fallback?: T): T | undefined {
  const { tokens, theme } = useTemplateEditor()

  return useMemo(() => {
    if (!ref) return fallback
    const resolved = resolveTokenReference(tokens, theme, ref)
    if (resolved === undefined || resolved === null) {
      return fallback
    }
    return resolved as T
  }, [tokens, theme, ref, fallback])
}
