export interface ResolvedCollectionItem {
  key?: string
  value?: unknown
  [key: string]: unknown
}

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { resolveCollection as resolveCollectionCore } from "./repeat-core.js"

export function resolveCollection(
  data: any,
  path: string,
  options?: { maxItems?: number },
): ResolvedCollectionItem[] {
  return resolveCollectionCore(data, path, options) as ResolvedCollectionItem[]
}
