"use client"

import { createContext, useContext, useMemo } from "react"

interface BindingScope {
  alias?: string
  data?: any
  indexAlias?: string
  index?: number
  lengthAlias?: string
  length?: number
}

interface BindingContextValue {
  root: any
  scopes: BindingScope[]
}

const BindingContext = createContext<BindingContextValue>({ root: {}, scopes: [] })

interface BindingProviderProps {
  data: any
  children: React.ReactNode
}

export function BindingProvider({ data, children }: BindingProviderProps) {
  const value = useMemo<BindingContextValue>(() => ({ root: data ?? {}, scopes: [] }), [data])
  return <BindingContext.Provider value={value}>{children}</BindingContext.Provider>
}

interface NestedBindingProviderProps extends BindingScope {
  children: React.ReactNode
}

export function NestedBindingProvider({ alias, data, indexAlias, index, lengthAlias, length, children }: NestedBindingProviderProps) {
  const parent = useContext(BindingContext)

  const next = useMemo<BindingContextValue>(
    () => ({
      root: parent.root,
      scopes: [
        ...parent.scopes,
        {
          alias,
          data,
          indexAlias,
          index,
          lengthAlias,
          length,
        },
      ],
    }),
    [alias, data, index, indexAlias, length, lengthAlias, parent],
  )

  return <BindingContext.Provider value={next}>{children}</BindingContext.Provider>
}

function cloneData<T>(value: T): T {
  if (typeof window !== "undefined" && typeof structuredClone === "function") {
    return structuredClone(value)
  }

  try {
    return JSON.parse(JSON.stringify(value))
  } catch (error) {
    return value
  }
}

function assignPath(target: any, path: string | undefined, value: any) {
  if (!path || path.trim().length === 0) {
    return
  }

  const segments = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) {
    return
  }

  let current = target

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = value
      return
    }

    if (!current[segment] || typeof current[segment] !== "object") {
      current[segment] = {}
    }
    current = current[segment]
  })
}

export function useBindingData() {
  const context = useContext(BindingContext)

  const merged = useMemo(() => {
    const base = cloneData(context.root ?? {}) || {}

    for (const scope of context.scopes) {
      assignPath(base, scope.alias, scope.data)

      if (scope.indexAlias !== undefined) {
        assignPath(base, scope.indexAlias, scope.index)
      }

      if (scope.lengthAlias !== undefined) {
        assignPath(base, scope.lengthAlias, scope.length)
      }
    }

    return base
  }, [context])

  return {
    data: merged,
  }
}
