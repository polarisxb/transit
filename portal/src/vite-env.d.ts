/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_API_TARGET?: string
  readonly VITE_API_PUBLIC_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
