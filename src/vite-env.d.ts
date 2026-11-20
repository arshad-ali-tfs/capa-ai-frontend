/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: "mock" | "api"
  /** Optional: call a service directly from the browser instead of the proxy. */
  readonly VITE_MAP_API_URL?: string
  /** Legacy MAP-only override; VITE_MAP_API_URL takes precedence. */
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MATCH_API_URL?: string
  readonly VITE_AUTHOR_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
