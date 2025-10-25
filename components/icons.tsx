import { Github, Globe, LucideIcon } from "lucide-react"
import type { SVGProps } from "react"

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="#EA4335"
        d="M12.24 10.29v3.54h4.98c-.2 1.13-.78 2.09-1.66 2.73v2.28h2.69c1.57-1.44 2.48-3.55 2.48-6.05 0-.59-.05-1.15-.15-1.69z"
      />
      <path
        fill="#34A853"
        d="M12.24 19.84c-2.26 0-4.16-.75-5.55-2.05l-2.69 2.28c1.7 1.62 3.91 2.61 6.24 2.61 2.64 0 4.87-.87 6.49-2.36l-2.69-2.28c-.93.62-2.12.98-3.8.98z"
      />
      <path
        fill="#4A90E2"
        d="M6.69 11.79c0-.57.1-1.12.27-1.63V7.88H4.27c-.55 1.09-.87 2.32-.87 3.91s.32 2.82.87 3.91l2.69-2.28c-.17-.51-.27-1.06-.27-1.63z"
      />
      <path
        fill="#FBBC05"
        d="M12.24 6.16c1.44 0 2.72.5 3.73 1.49l2.8-2.8C16.99 3.51 15.08 2.84 12.24 2.84c-2.33 0-4.54.99-6.24 2.61l2.69 2.28c1.39-1.3 3.29-1.57 3.55-1.57z"
      />
      <path
        fill="none"
        d="M2 2h20v20H2z"
      />
    </svg>
  )
}

export const Icons: Record<string, LucideIcon | ((props: SVGProps<SVGSVGElement>) => JSX.Element)> = {
  github: Github,
  google: GoogleIcon,
  globe: Globe,
}

export default Icons
