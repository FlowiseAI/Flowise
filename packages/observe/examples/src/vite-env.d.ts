/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
    readonly VITE_API_TOKEN: string
    readonly VITE_FLOW_ID: string
    readonly VITE_EXECUTION_ID: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
