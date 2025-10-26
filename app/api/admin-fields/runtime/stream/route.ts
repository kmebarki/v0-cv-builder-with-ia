import { NextResponse } from "next/server"
import {
  getAdminFieldRuntime,
  serializeRuntime,
  subscribeAdminFieldRuntime,
} from "@/lib/editor/admin-field-runtime"

export const runtime = "nodejs"

function formatEvent(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: Request) {
  const encoder = new TextEncoder()
  const initial = await getAdminFieldRuntime()
  const snapshot = serializeRuntime(initial)

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (snapshot) {
        controller.enqueue(encoder.encode(formatEvent(snapshot)))
      }

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(":keep-alive\n\n"))
      }, 30000)

      const unsubscribe = subscribeAdminFieldRuntime((payload) => {
        controller.enqueue(encoder.encode(formatEvent(payload)))
      })

      const close = () => {
        clearInterval(keepAlive)
        unsubscribe()
        controller.close()
      }

      request.signal.addEventListener("abort", close)
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  })
}
