"use client"

import { useMemo } from "react"
import { useTemplateEditor } from "@/components/editor/editor-context"
import { buildVariableRegistry } from "@/lib/editor/variables"

export function useVariableRegistry() {
  const { adminFields } = useTemplateEditor()
  return useMemo(() => buildVariableRegistry(adminFields), [adminFields])
}
