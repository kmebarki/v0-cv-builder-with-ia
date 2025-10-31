import rawTokens from "./design-tokens.json"

export const DESIGN_TOKENS = rawTokens as {
  colors: Record<string, string>
  fonts: Record<string, { family: string; weight: number; lineHeight: number }>
  fontSizes: Record<string, { size: number; lineHeight: number }>
  spacing: Record<string, number>
  radii: Record<string, number>
  shadows: Record<string, string>
  themes: Record<string, { name: string; surface: string; background: string; text: string; subtleText: string; divider: string }>
}
