export interface DocxExportPayload {
  cvName: string
  cvData: any
  structure: string
  html: string
  styles: string
  mode: "a4" | "mobile" | "web"
  theme?: "light" | "dark"
  tokens?: any
  tokenSource?: string
}

export interface DocxEntry {
  path: string
  data: string
}

export function buildDocxEntries(payload: DocxExportPayload): DocxEntry[]
