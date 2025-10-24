"use client"

import { useNode } from "@craftjs/core"

interface ImageNodeProps {
  src?: string
  alt?: string
  width?: number
  height?: number
}

export function ImageNode({ src = "/placeholder.svg", alt = "Image", width = 200, height = 200 }: ImageNodeProps) {
  const {
    connectors: { connect, drag },
  } = useNode()

  return (
    <img
      ref={(ref) => ref && connect(drag(ref))}
      src={src || "/placeholder.svg"}
      alt={alt}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        objectFit: "cover",
      }}
    />
  )
}

ImageNode.craft = {
  displayName: "Image",
  props: {
    src: "/placeholder.svg",
    alt: "Image",
    width: 200,
    height: 200,
  },
}
