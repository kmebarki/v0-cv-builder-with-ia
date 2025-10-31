"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type SessionUser = {
  id: string
  email: string | null
  roles: string[]
}

export function useUser() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let ignore = false

    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        })
        const data = (await response.json()) as { user: SessionUser | null }
        if (!ignore) {
          setUser(data.user)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    fetchUser()

    const onFocus = () => {
      fetchUser().catch(console.error)
    }

    window.addEventListener("focus", onFocus)
    return () => {
      ignore = true
      window.removeEventListener("focus", onFocus)
    }
  }, [router])

  return { user, loading }
}
