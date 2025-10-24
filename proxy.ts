// proxy.ts (RACINE DU PROJET)
import { updateSession } from "@/lib/supabase/middleware"

// Le proxy remplace ton middleware : on propage la requête en actualisant la session supabase
export async function proxy(request: Request) {
  return updateSession(request)
}

// Conserver le même matcher
export const config = {
  matcher: [
    // Exclure static assets, images optimisées et fichiers publics
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
