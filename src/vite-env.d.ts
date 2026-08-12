/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_TAC_TOE_CONTRACT_ADDRESS?: `0x${string}`
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
