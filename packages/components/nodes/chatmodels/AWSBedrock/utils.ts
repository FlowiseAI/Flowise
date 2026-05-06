/**
 * Bedrock-specific utilities for the AWS Bedrock Converse node.
 *
 * This module centralizes all Bedrock model resolution logic:
 *
 * - **validateEndpointHost** — Sanitizes the endpointHost field. Auto-migrates
 *   ARNs that users mistakenly placed there (the original "invalid URL" bug).
 *
 * - **discoverInferenceProfiles** — Runtime discovery of which inference profiles
 *   exist in a given region via the Bedrock control-plane API. Cached per region.
 *   @see https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles.html
 *
 * - **resolveBedrockModel** — Determines the correct model ID and optional
 *   applicationInferenceProfile for a Converse API call. Handles ARNs,
 *   geo-prefixed profile IDs, and auto-application of profiles for models
 *   that require them.
 *   @see https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-use.html
 *
 * - **getStopSeqUnsupportedModels** — Loads the set of models that reject the
 *   stopSequences inference config field, read from models.json (`stop_sequences: false`).
 *
 * - **normalizeBedrockError** — Rewrites raw Bedrock Converse API errors into
 *   actionable user-facing messages.
 *
 * All model metadata (inference profile geos, stop_sequences flags) lives in
 * models.json as the single source of truth, loaded via the model loader.
 */

// ---------------------------------------------------------------------------
// Endpoint-host validation
// ---------------------------------------------------------------------------

export interface EndpointHostResult {
    /** The sanitized hostname to use, or undefined if the value was an ARN/URL that should be ignored. */
    hostname?: string
    /** If the value looked like an ARN, it is returned here so init() can treat it as a model target. */
    migratedArn?: string
}

/**
 * Inspects the endpointHost value and decides what to do with it.
 *
 * - Bare hostname (valid) → returned as-is.
 * - ARN (common misconfiguration) → stripped from endpointHost and
 *   returned as `migratedArn` so init() can route it to the inference
 *   profile path.  This provides backward compatibility for existing
 *   flows that placed ARNs in the wrong field.
 * - URL with scheme → hostname extracted and returned with a console
 *   warning.
 */
export function validateEndpointHost(value: string): EndpointHostResult {
    // ARN in endpointHost — auto-migrate to inference profile
    if (value.startsWith('arn:aws:bedrock:')) {
        console.warn(
            `[AWSBedrock] "Custom Endpoint Host" contained an ARN (${value}). ` +
                `This has been auto-migrated to the inference profile path. ` +
                `Please move this value to the "Custom Model ARN" field instead.`
        )
        return { migratedArn: value }
    }

    // URL with scheme — extract hostname
    if (value.includes('://')) {
        try {
            const url = new URL(value)
            console.warn(`[AWSBedrock] "Custom Endpoint Host" contained a full URL. ` + `Using hostname "${url.hostname}" only.`)
            return { hostname: url.hostname }
        } catch {
            // If URL parsing fails, reject
            return {}
        }
    }

    // Contains a path — likely a mistake, but not an ARN
    if (value.includes('/')) {
        console.warn(
            `[AWSBedrock] "Custom Endpoint Host" contained a path separator. ` + `Using the value before the first "/" as hostname.`
        )
        return { hostname: value.split('/')[0] }
    }

    // Valid bare hostname
    return { hostname: value }
}

// ---------------------------------------------------------------------------
// Runtime inference-profile discovery
// ---------------------------------------------------------------------------

/**
 * Per-region cache of available inference profile IDs.
 * Populated by calling `ListInferenceProfiles` once per region.
 */
const _regionProfileCache = new Map<string, Set<string>>()

/**
 * Discovers which system-defined inference profiles are available in a
 * given region by calling the Bedrock control-plane API.  Results are
 * cached in-memory for the process lifetime.
 *
 * This is necessary because inference profile availability is per-region,
 * not per-geo. For example, `eu.amazon.nova-pro-v1:0` exists in eu-west-1
 * but NOT in eu-west-2, even though both are EU regions.
 *
 * Uses the same credentials the user configured on the Bedrock node
 * (UI creds, AssumeRole, or SDK default chain).
 *
 * Note: The API paginates (~13 results per page despite maxResults: 100),
 * so we loop on nextToken to get the full list.
 *
 * On any error (auth failure, region not supported, etc.) returns an
 * empty set — the caller falls back to direct invocation without a profile.
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/APIReference/API_ListInferenceProfiles.html
 */
export async function discoverInferenceProfiles(
    region: string,
    credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
): Promise<Set<string>> {
    if (_regionProfileCache.has(region)) {
        return _regionProfileCache.get(region)!
    }

    try {
        const { BedrockClient, ListInferenceProfilesCommand } = await import('@aws-sdk/client-bedrock')
        const client = new BedrockClient({
            region,
            ...(credentials && { credentials })
        })
        const ids = new Set<string>()
        let nextToken: string | undefined
        do {
            const resp = await client.send(
                new ListInferenceProfilesCommand({
                    typeEquals: 'SYSTEM_DEFINED',
                    maxResults: 100,
                    ...(nextToken && { nextToken })
                })
            )
            for (const p of resp.inferenceProfileSummaries ?? []) {
                if (p.inferenceProfileId) {
                    ids.add(p.inferenceProfileId)
                }
            }
            nextToken = resp.nextToken
        } while (nextToken)
        _regionProfileCache.set(region, ids)
        return ids
    } catch {
        const empty = new Set<string>()
        _regionProfileCache.set(region, empty)
        return empty
    }
}

/** Exported for testing — resets the region profile cache. */
export function _resetRegionProfileCache(): void {
    _regionProfileCache.clear()
}

// ---------------------------------------------------------------------------
// Stop-sequence support
// ---------------------------------------------------------------------------

/**
 * Cached set of model IDs that do NOT support the stopSequences
 * inference-config field.  Populated from models.json via the model
 * loader by looking for `stop_sequences: false`.
 *
 * Affected models include DeepSeek and OpenAI GPT OSS variants which
 * return: "This model doesn't support the stopSequences field."
 * We use exact model IDs (not prefix matching) because future models
 * from the same provider may add stopSequences support.
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html
 */
let _stopSeqUnsupported: Set<string> | null = null

export async function getStopSeqUnsupportedModels(): Promise<Set<string>> {
    if (_stopSeqUnsupported) return _stopSeqUnsupported
    try {
        const { getModels, MODEL_TYPE } = await import('../../../src/modelLoader')
        const models = await getModels(MODEL_TYPE.CHAT, 'awsChatBedrock')
        _stopSeqUnsupported = new Set(models.filter((m: any) => m.stop_sequences === false).map((m: any) => m.name))
    } catch {
        _stopSeqUnsupported = new Set()
    }
    return _stopSeqUnsupported
}

/** Exported for testing — resets the stop-sequence cache. */
export function _resetStopSeqCache(): void {
    _stopSeqUnsupported = null
}

// ---------------------------------------------------------------------------
// Model / inference-profile resolution
// ---------------------------------------------------------------------------

/**
 * Cached map of model ID → available geo prefixes (e.g. ['us','eu','global']).
 * Populated at first use from the model catalog (models.json via the
 * model loader) by reading the `inference_profile_geos` array on each model.
 */
let _inferenceProfileGeos: Map<string, string[]> | null = null

async function getInferenceProfileGeos(): Promise<Map<string, string[]>> {
    if (_inferenceProfileGeos) return _inferenceProfileGeos
    try {
        const { getModels, MODEL_TYPE } = await import('../../../src/modelLoader')
        const models = await getModels(MODEL_TYPE.CHAT, 'awsChatBedrock')
        _inferenceProfileGeos = new Map()
        for (const m of models) {
            if ((m as any).inference_profile_geos?.length) {
                _inferenceProfileGeos.set((m as any).name, (m as any).inference_profile_geos)
            }
        }
    } catch {
        _inferenceProfileGeos = new Map()
    }
    return _inferenceProfileGeos
}

/** Exported for testing -- resets the cached map so tests can control it. */
export function _resetInferenceProfileCache(): void {
    _inferenceProfileGeos = null
}

/**
 * Returns an ordered list of geo-prefix candidates for a given AWS region.
 * The first match against a model's `inference_profile_geos` wins.
 *
 * Some regions have unique prefixes (jp for Tokyo, ca for Canada)
 * alongside broader geo prefixes. The fallback chain in
 * resolveBedrockModel() appends `global` and `us` after these candidates.
 *
 * Source: `aws bedrock list-inference-profiles --type-equals SYSTEM_DEFINED`
 * across us-east-1, us-west-2, eu-west-1, eu-central-1, ap-southeast-1,
 * ap-northeast-1, ca-central-1, sa-east-1 (2026-04-16).
 */
export function regionToGeoCandidates(region: string): string[] {
    if (region.startsWith('us-')) return ['us']
    if (region.startsWith('eu-')) return ['eu']
    if (region === 'ap-northeast-1' || region === 'ap-northeast-3') return ['jp', 'apac']
    if (region === 'ap-southeast-2') return ['au', 'apac']
    if (region.startsWith('ap-')) return ['apac']
    if (region.startsWith('ca-')) return ['ca', 'us']
    if (region.startsWith('sa-')) return [] // SA only has global. profiles, handled by fallback
    return ['us']
}

/**
 * Geo-prefixes used by Bedrock cross-region inference profile IDs.
 * These are prepended to the base model ID to form the profile ID
 * (e.g., `us.anthropic.claude-sonnet-4-6`).
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-support.html
 */
const GEO_PREFIX_RE = /^(us|eu|apac|jp|au|ca|global)\./

export interface ResolvedBedrockModel {
    /** The base model ID (used for metadata, pricing lookup, etc.). */
    modelId: string
    /** Set when the target requires profile-routed inference. */
    applicationInferenceProfile?: string
}

/**
 * Accepts whatever the user typed into `customModel` (or the dropdown
 * selection) and returns the values that should be passed to
 * ChatBedrockConverseInput.
 *
 * Detection logic:
 *
 * 1. ARN (`arn:aws:bedrock:…`) → treated as an inference-profile or
 *    provisioned-model ARN.  The dropdown model is kept as `modelId`
 *    for metadata.
 * 2. Geo-prefixed ID (`us.`, `eu.`, `apac.`, `global.`) → cross-region
 *    inference profile.  The prefix is stripped to derive `modelId`.
 * 3. Plain model ID → passed through as `modelId`.
 * 4. Empty / undefined → falls back to `dropdownModel`.
 *
 * After detection, if no explicit profile was set, the model's
 * `inference_profile_geos` from models.json is checked.  The best
 * geo is chosen by trying candidates from regionToGeoCandidates()
 * in order, then falling back to global → us → none.
 *
 * When `useGlobalEndpoint` is true, skips regional candidates and
 * tries `global.*` first. Falls back to normal selection if the model
 * has no global profile.
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles.html
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html
 */
export async function resolveBedrockModel(
    customModel: string | undefined,
    dropdownModel: string,
    region?: string,
    availableProfiles?: Set<string>,
    useGlobalEndpoint?: boolean
): Promise<ResolvedBedrockModel> {
    const resolvedInput = customModel?.trim() || dropdownModel
    let modelId = resolvedInput
    let applicationInferenceProfile: string | undefined

    if (resolvedInput.startsWith('arn:aws:bedrock:')) {
        // Full ARN — use as inference profile, keep dropdown for metadata
        applicationInferenceProfile = resolvedInput
        modelId = dropdownModel
    } else if (GEO_PREFIX_RE.test(resolvedInput)) {
        // Cross-region inference profile ID (e.g. us.anthropic.claude-sonnet-4-6)
        applicationInferenceProfile = resolvedInput
        modelId = resolvedInput.replace(GEO_PREFIX_RE, '')
    }

    // Auto-apply inference profile using best available geo for the region.
    // If useGlobalEndpoint is true, try global.* first.
    // Otherwise try region-specific candidates first, then global, then us.
    // If availableProfiles is provided (from runtime discovery), only apply
    // a profile that is confirmed to exist in the target region.
    if (!applicationInferenceProfile) {
        const geoMap = await getInferenceProfileGeos()
        const modelGeos = geoMap.get(modelId)
        if (modelGeos?.length) {
            let allCandidateGeos: string[]
            if (useGlobalEndpoint && modelGeos.includes('global')) {
                allCandidateGeos = ['global']
            } else {
                const candidates = regionToGeoCandidates(region || 'us-east-1')
                allCandidateGeos = [...candidates]
                if (modelGeos.includes('global')) allCandidateGeos.push('global')
                if (modelGeos.includes('us') && !allCandidateGeos.includes('us')) allCandidateGeos.push('us')
            }

            for (const geo of allCandidateGeos) {
                if (!modelGeos.includes(geo)) continue
                const profileId = `${geo}.${modelId}`
                if (availableProfiles) {
                    // Runtime discovery: only apply if confirmed in this region
                    if (availableProfiles.has(profileId)) {
                        applicationInferenceProfile = profileId
                        break
                    }
                } else {
                    // No runtime data: trust models.json (backward compat)
                    applicationInferenceProfile = profileId
                    break
                }
            }
        }
    }

    return { modelId, applicationInferenceProfile }
}

// ---------------------------------------------------------------------------
// Error normalization
// ---------------------------------------------------------------------------

/**
 * Rewrites common Bedrock Converse runtime errors into actionable messages.
 *
 * Handled patterns:
 * - "inference profile" / "on-demand throughput" → guides user to select model from dropdown
 * - "doesn't support Converse" → suggests providing imported model ARN in Custom Model ARN field
 * - "doesn't support ... field" → explains some models reject certain inference config params
 *
 * Returns the original error unchanged if no pattern matches.
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html
 */
export function normalizeBedrockError(err: unknown): Error {
    if (!(err instanceof Error)) return err as Error
    const msg = err.message ?? ''

    // Model requires an inference profile
    if (msg.includes('inference profile') || (msg.includes('ValidationException') && msg.includes('on-demand throughput'))) {
        return new Error(
            `This model requires a cross-region inference profile. ` +
                `The system attempted to auto-apply one but none was available in this region. ` +
                `For built-in models, select the model from the "Model Name" dropdown and choose a supported region. ` +
                `Original error: ${msg}`
        )
    }

    // Model does not support the Converse API
    if (msg.includes("doesn't support") && msg.includes('Converse')) {
        return new Error(
            `This model does not support the Bedrock Converse API. ` +
                `If this is an imported model, provide its full ARN in the "Custom Model ARN" field ` +
                `— it will be auto-routed to the InvokeModel API. ` +
                `Original error: ${msg}`
        )
    }

    // Model doesn't support a specific field (e.g. stopSequences)
    if (msg.includes("doesn't support") && msg.includes('field')) {
        return new Error(
            `This model rejected a request parameter. ` +
                `Some Bedrock models do not support all inference configuration fields. ` +
                `Original error: ${msg}`
        )
    }

    return err
}
