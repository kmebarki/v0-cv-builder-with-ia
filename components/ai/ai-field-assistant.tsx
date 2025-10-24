"use client"
import { AIAssistantDialog } from "./ai-assistant-dialog"

interface AIFieldAssistantProps {
  value: string
  onApply: (text: string) => void
  context?: any
  showGenerate?: boolean
  showImprove?: boolean
  showRephrase?: boolean
  showTranslate?: boolean
  showKeywords?: boolean
}

export function AIFieldAssistant({
  value,
  onApply,
  context,
  showGenerate = true,
  showImprove = true,
  showRephrase = true,
  showTranslate = false,
  showKeywords = false,
}: AIFieldAssistantProps) {
  const hasValue = value && value.trim().length > 0

  return (
    <div className="flex flex-wrap gap-2">
      {showGenerate && <AIAssistantDialog mode="generate" context={context} onApply={onApply} />}

      {hasValue && showImprove && (
        <AIAssistantDialog mode="improve" initialText={value} context={context} onApply={onApply} />
      )}

      {hasValue && showRephrase && <AIAssistantDialog mode="rephrase" initialText={value} onApply={onApply} />}

      {hasValue && showTranslate && <AIAssistantDialog mode="translate" initialText={value} onApply={onApply} />}

      {hasValue && showKeywords && <AIAssistantDialog mode="keywords" initialText={value} onApply={onApply} />}
    </div>
  )
}
