"use client"

import { useNode } from "@craftjs/core"
import type { ReactNode } from "react"

interface ContainerProps {
  children?: ReactNode
  className?: string
  padding?: number
  margin?: number
  background?: string
}

export function Container({
  children,
  className = "",
  padding = 0,
  margin = 0,
  background = "transparent",
}: ContainerProps) {
  const {
    connectors: { connect, drag },
  } = useNode()

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      className={className}
      style={{
        padding: `${padding}px`,
        margin: `${margin}px`,
        background,
      }}
    >
      {children}
    </div>
  )
}

Container.craft = {
  displayName: "Container",
  props: {
    padding: 0,
    margin: 0,
    background: "transparent",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
  },
}
