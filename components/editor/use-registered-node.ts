import { useCallback, useEffect, useRef } from "react"
import { useNode } from "@craftjs/core"
import { useTemplateEditor } from "@/components/editor/editor-context"

interface RegisteredNodeCollector {
  id: string
  customPosition: { x?: number; y?: number }
  locked?: boolean
}

export function useRegisteredNode() {
  const { registerNodeElement, unregisterNodeElement, snapPreview } = useTemplateEditor()
  const {
    id,
    connectors: { connect, drag },
    customPosition,
    locked,
  } = useNode<RegisteredNodeCollector>((node) => ({
    id: node.id,
    customPosition: (node.data.custom as { position?: { x?: number; y?: number } })?.position ?? {},
    locked: Boolean((node.data.custom as { locked?: boolean })?.locked),
  }))

  const elementRef = useRef<HTMLElement | null>(null)

  const setRef = useCallback(
    (element: HTMLElement | null) => {
      if (elementRef.current === element) {
        return
      }

      if (elementRef.current) {
        unregisterNodeElement(id)
      }

      if (element) {
        const target = locked ? connect(element) : connect(drag(element))
        target.setAttribute("data-pagination-node-id", id)
        registerNodeElement(id, target)
        elementRef.current = target
      } else {
        elementRef.current = null
      }
    },
    [connect, drag, id, locked, registerNodeElement, unregisterNodeElement],
  )

  useEffect(() => {
    return () => {
      if (elementRef.current) {
        unregisterNodeElement(id)
      }
    }
  }, [id, unregisterNodeElement])

  useEffect(() => {
    if (!elementRef.current) return
    elementRef.current.dataset.editorLocked = locked ? "true" : "false"
    if (locked) {
      elementRef.current.style.pointerEvents = "none"
    } else {
      elementRef.current.style.removeProperty("pointer-events")
    }
  }, [locked])

  const preview = snapPreview[id] ?? { x: 0, y: 0 }
  const baseX = Number(customPosition.x ?? 0)
  const baseY = Number(customPosition.y ?? 0)

  return {
    ref: setRef,
    translateX: baseX + preview.x,
    translateY: baseY + preview.y,
    nodeId: id,
    locked,
  }
}
