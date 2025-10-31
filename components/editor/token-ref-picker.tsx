"use client"

import { useMemo } from "react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useTemplateEditor } from "@/components/editor/editor-context"

export type TokenCategory = "color" | "spacing" | "radius" | "shadow" | "font" | "fontSize" | "theme"

interface TokenRefPickerProps {
  label?: string
  value?: string
  onChange: (value: string) => void
  category: TokenCategory
  allowCustom?: boolean
  placeholder?: string
}

interface OptionGroup {
  label: string
  items: { value: string; label: string }[]
}

function buildOptions(tokens: any, category: TokenCategory): OptionGroup[] {
  switch (category) {
    case "color": {
      const base = Object.entries(tokens.colors ?? {}).map(([key]) => ({
        value: `colors.${key}`,
        label: key,
      }))
      const themes = tokens.themes
        ? Object.keys(tokens.themes).map((themeKey) => ({
            value: `themes.${themeKey}.surface`,
            label: `themes.${themeKey}.surface`,
          }))
        : []
      return [
        { label: "Couleurs", items: base },
        { label: "Thèmes", items: themes },
      ]
    }
    case "spacing": {
      const items = Object.entries(tokens.spacing ?? {}).map(([key]) => ({
        value: `spacing.${key}`,
        label: key,
      }))
      return [{ label: "Espacements", items }]
    }
    case "radius": {
      const items = Object.entries(tokens.radii ?? {}).map(([key]) => ({
        value: `radii.${key}`,
        label: key,
      }))
      return [{ label: "Rayons", items }]
    }
    case "shadow": {
      const items = Object.entries(tokens.shadows ?? {}).map(([key]) => ({
        value: `shadows.${key}`,
        label: key,
      }))
      return [{ label: "Ombres", items }]
    }
    case "font": {
      const items = Object.entries(tokens.fonts ?? {}).map(([key, value]: any) => ({
        value: `fonts.${key}`,
        label: `${key} (${value.family})`,
      }))
      return [{ label: "Typographies", items }]
    }
    case "fontSize": {
      const items = Object.entries(tokens.fontSizes ?? {}).map(([key]) => ({
        value: `fontSizes.${key}`,
        label: key,
      }))
      return [{ label: "Tailles", items }]
    }
    case "theme": {
      const items = Object.entries(tokens.themes ?? {}).flatMap(([themeKey, themeValue]: any) =>
        Object.keys(themeValue ?? {}).map((tokenKey) => ({
          value: `themes.${themeKey}.${tokenKey}`,
          label: `${themeKey}.${tokenKey}`,
        })),
      )
      return [{ label: "Thèmes", items }]
    }
    default:
      return []
  }
}

export function TokenRefPicker({ label, value, onChange, category, allowCustom = true, placeholder }: TokenRefPickerProps) {
  const { tokens } = useTemplateEditor()
  const groups = useMemo(() => buildOptions(tokens, category), [tokens, category])

  return (
    <div className="space-y-2">
      {label && <span className="text-sm font-medium text-muted-foreground">{label}</span>}
      <div className="flex flex-col gap-2">
        <Select value={value ?? ""} onValueChange={(next) => onChange(next)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder ?? "Sélectionner un token"} />
          </SelectTrigger>
          <SelectContent>
            {allowCustom && <SelectItem value="">Aucun token</SelectItem>}
            {groups.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {allowCustom && (
          <Input
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Référence personnalisée (ex: colors.primary)"
          />
        )}
      </div>
    </div>
  )
}
