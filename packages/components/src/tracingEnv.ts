import { getEnvironmentVariable } from './utils'
import { ICommonObject } from './Interface'

export interface TracingEnvProvider {
    name: string
    getEnvConfig: () => ICommonObject | undefined
    /**
     * Map env config to the `(providerConfig, credentialData)` pair the UI-driven analytics loop
     * consumes, so env-var and UI sources flow through the same code path — no duplicate client
     * construction.
     */
    buildProviderEntry: (cfg: ICommonObject) => { providerConfig: ICommonObject; credentialData: ICommonObject }
}

/**
 * Process-lifetime cache for env-var tracing configs.
 *
 * Entries are populated on first access and never expire — a server restart is
 * required to pick up env-var changes. This is intentional: env vars are set at
 * deploy time and re-reading them on every agent execution would add overhead
 * with no benefit. Use {@link resetTracingEnvCache} (test-only) to clear the
 * cache in unit tests.
 */
const tracingEnvConfigCache = new Map<string, { value: ICommonObject | undefined }>()
const memoizeEnvConfig = (name: string, resolver: () => ICommonObject | undefined): (() => ICommonObject | undefined) => {
    return () => {
        const cached = tracingEnvConfigCache.get(name)
        if (cached) return cached.value
        const value = resolver()
        tracingEnvConfigCache.set(name, { value })
        return value
    }
}

/** @internal Test-only: drop cached env-var tracing configs so a subsequent call re-reads env. */
export const resetTracingEnvCache = (): void => {
    tracingEnvConfigCache.clear()
}

/**
 * Env var flags that activate LangChain's built-in auto-tracer (see @langchain/core
 * `isTracingEnabled()`). Once Flowise adopts the tracing config, these must be cleared from
 * `process.env` so the auto-tracer doesn't emit duplicate top-level runs alongside Flowise's
 * manual `onLLMStart`/`onToolStart` child RunTrees.
 */
const LANGCHAIN_TRACING_FLAG_VARS = ['LANGSMITH_TRACING', 'LANGCHAIN_TRACING_V2', 'LANGSMITH_TRACING_V2', 'LANGCHAIN_TRACING'] as const

/**
 * Reads LangSmith env vars (both new `LANGSMITH_*` and legacy `LANGCHAIN_*` prefixes).
 * Returns a config object if tracing is enabled and an API key is present; otherwise undefined.
 *
 * Side effect: on a successful read, the four LangChain tracing-flag env vars are deleted from
 * `process.env`. Flowise owns tracing emission from this point on; leaving the flags set would let
 * LangChain's auto-tracer fire on every `.invoke()`/`.call()` and produce orphan top-level runs
 * next to the manually-emitted parent/child RunTree.
 */
export const getLangSmithEnvConfig = (): { apiKey: string; endpoint?: string; projectName?: string } | undefined => {
    const tracingFlag = getEnvironmentVariable('LANGSMITH_TRACING') ?? getEnvironmentVariable('LANGCHAIN_TRACING_V2')
    if (tracingFlag !== 'true') return undefined

    const apiKey = getEnvironmentVariable('LANGSMITH_API_KEY') ?? getEnvironmentVariable('LANGCHAIN_API_KEY')
    if (!apiKey) return undefined

    const endpoint = getEnvironmentVariable('LANGSMITH_ENDPOINT') ?? getEnvironmentVariable('LANGCHAIN_ENDPOINT')
    const projectName = getEnvironmentVariable('LANGSMITH_PROJECT') ?? getEnvironmentVariable('LANGCHAIN_PROJECT')

    // the four LangChain tracing-flag env vars are deleted from `process.env`. Flowise owns tracing
    // emission from this point on; leaving the flags set would letLangChain's auto-tracer fire on
    // every `.invoke()`/`.call()` and produce orphan top-level runs next to the manually-emitted
    // parent/child RunTree.
    for (const k of LANGCHAIN_TRACING_FLAG_VARS) delete process.env[k]

    return { apiKey, endpoint, projectName }
}

export const TRACING_ENV_PROVIDERS: TracingEnvProvider[] = [
    {
        name: 'langSmith',
        getEnvConfig: memoizeEnvConfig('langSmith', getLangSmithEnvConfig),
        buildProviderEntry: (cfg) => ({
            providerConfig: { projectName: cfg.projectName ?? 'default', status: true },
            credentialData: {
                langSmithApiKey: cfg.apiKey,
                ...(cfg.endpoint ? { langSmithEndpoint: cfg.endpoint } : {})
            }
        })
    }
]

export const tracingEnvEnabled = (): boolean => TRACING_ENV_PROVIDERS.some((p) => p.getEnvConfig() !== undefined)

/**
 * Merge env-var-enabled tracing providers into the analytic map. UI config wins when both sources
 * activate the same provider. Returns a credentialData map for env-injected providers so the loop
 * can skip DB credential loading for those entries.
 */
export const applyEnvTracingProviders = (
    analytic: Record<string, any>
): { analytic: Record<string, any>; envCredentials: Record<string, ICommonObject> } => {
    const envCredentials: Record<string, ICommonObject> = {}
    const newEntries: Record<string, any> = {}
    for (const p of TRACING_ENV_PROVIDERS) {
        const cfg = p.getEnvConfig()
        if (!cfg) continue
        if (analytic[p.name]?.status === true) continue
        const { providerConfig, credentialData } = p.buildProviderEntry(cfg)
        newEntries[p.name] = providerConfig
        envCredentials[p.name] = credentialData
    }
    return { analytic: { ...analytic, ...newEntries }, envCredentials }
}
