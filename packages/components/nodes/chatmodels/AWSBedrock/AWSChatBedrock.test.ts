import {
    validateEndpointHost,
    resolveBedrockModel,
    normalizeBedrockError,
    regionToGeoCandidates,
    getStopSeqUnsupportedModels,
    _resetInferenceProfileCache,
    _resetStopSeqCache
} from './utils'
import { detectFormat } from './FlowiseAWSChatBedrockImported'

// Mock the model loader to return models with inference_profile_geos and stop_sequences
jest.mock('../../../src/modelLoader', () => ({
    MODEL_TYPE: { CHAT: 'chat' },
    getModels: jest
        .fn()
        .mockResolvedValue([
            { name: 'anthropic.claude-sonnet-4-6', inference_profile_geos: ['us', 'eu', 'jp', 'au', 'global'] },
            { name: 'anthropic.claude-opus-4-5-20251101-v1:0', inference_profile_geos: ['us', 'eu', 'global'] },
            { name: 'amazon.nova-2-lite-v1:0', inference_profile_geos: ['us', 'eu', 'jp', 'global'] },
            { name: 'amazon.nova-lite-v1:0', inference_profile_geos: ['us', 'eu', 'apac', 'ca'] },
            { name: 'amazon.nova-pro-v1:0', inference_profile_geos: ['us', 'eu', 'apac'] },
            { name: 'meta.llama4-scout-17b-instruct-v1:0', inference_profile_geos: ['us'] },
            { name: 'deepseek.v3.2', stop_sequences: false },
            { name: 'deepseek.r1-v1:0', inference_profile_geos: ['us'], stop_sequences: false },
            { name: 'openai.gpt-oss-20b-1:0', stop_sequences: false },
            { name: 'openai.gpt-oss-safeguard-20b', stop_sequences: false },
            { name: 'writer.palmyra-x5-v1:0', inference_profile_geos: ['us'] },
            { name: 'minimax.minimax-m2' },
            { name: 'nvidia.nemotron-nano-9b-v2' },
            { name: 'qwen.qwen3-32b-v1:0' },
            { name: 'google.gemma-3-4b-it' },
            { name: 'anthropic.claude-3-haiku-20240307-v1:0' }
        ])
}))

beforeEach(() => {
    _resetInferenceProfileCache()
    _resetStopSeqCache()
})

// ---------------------------------------------------------------------------
// validateEndpointHost
// ---------------------------------------------------------------------------

describe('validateEndpointHost', () => {
    it('accepts a bare hostname', () => {
        const result = validateEndpointHost('bedrock-runtime.us-east-1.amazonaws.com')
        expect(result.hostname).toBe('bedrock-runtime.us-east-1.amazonaws.com')
        expect(result.migratedArn).toBeUndefined()
    })

    it('accepts a hostname with port', () => {
        const result = validateEndpointHost('bedrock-runtime.us-east-1.amazonaws.com:443')
        expect(result.hostname).toBe('bedrock-runtime.us-east-1.amazonaws.com:443')
    })

    it('auto-migrates an ARN to migratedArn', () => {
        const arn = 'arn:aws:bedrock:us-east-1:123456789012:provisioned-model/abc'
        const result = validateEndpointHost(arn)
        expect(result.hostname).toBeUndefined()
        expect(result.migratedArn).toBe(arn)
    })

    it('extracts hostname from a URL with scheme', () => {
        const result = validateEndpointHost('https://bedrock-runtime.us-east-1.amazonaws.com')
        expect(result.hostname).toBe('bedrock-runtime.us-east-1.amazonaws.com')
        expect(result.migratedArn).toBeUndefined()
    })

    it('extracts hostname before path separator', () => {
        const result = validateEndpointHost('bedrock-runtime.us-east-1.amazonaws.com/model/invoke')
        expect(result.hostname).toBe('bedrock-runtime.us-east-1.amazonaws.com')
    })
})

// ---------------------------------------------------------------------------
// resolveBedrockModel
// ---------------------------------------------------------------------------

describe('regionToGeoCandidates', () => {
    it('maps us- regions to [us]', () => expect(regionToGeoCandidates('us-east-1')).toEqual(['us']))
    it('maps us-west-2 to [us]', () => expect(regionToGeoCandidates('us-west-2')).toEqual(['us']))
    it('maps eu- regions to [eu]', () => expect(regionToGeoCandidates('eu-west-1')).toEqual(['eu']))
    it('maps eu-central-1 to [eu]', () => expect(regionToGeoCandidates('eu-central-1')).toEqual(['eu']))
    it('maps ap-southeast-1 to [apac]', () => expect(regionToGeoCandidates('ap-southeast-1')).toEqual(['apac']))
    it('maps ap-northeast-1 (Tokyo) to [jp, apac]', () => expect(regionToGeoCandidates('ap-northeast-1')).toEqual(['jp', 'apac']))
    it('maps ap-northeast-3 (Osaka) to [jp, apac]', () => expect(regionToGeoCandidates('ap-northeast-3')).toEqual(['jp', 'apac']))
    it('maps ap-southeast-2 (Sydney) to [au, apac]', () => expect(regionToGeoCandidates('ap-southeast-2')).toEqual(['au', 'apac']))
    it('maps ap-northeast-2 (Seoul) to [apac]', () => expect(regionToGeoCandidates('ap-northeast-2')).toEqual(['apac']))
    it('maps ap-south-1 to [apac]', () => expect(regionToGeoCandidates('ap-south-1')).toEqual(['apac']))
    it('maps ca-central-1 to [ca, us]', () => expect(regionToGeoCandidates('ca-central-1')).toEqual(['ca', 'us']))
    it('maps sa-east-1 to [] (global fallback only)', () => expect(regionToGeoCandidates('sa-east-1')).toEqual([]))
    it('defaults to [us] for unknown regions', () => expect(regionToGeoCandidates('me-south-1')).toEqual(['us']))
})

describe('resolveBedrockModel', () => {
    const dropdown = 'anthropic.claude-3-haiku-20240307-v1:0'

    // --- basic resolution ---
    it('falls back to dropdown when customModel is empty (model not in map)', async () => {
        const result = await resolveBedrockModel('', dropdown, 'us-east-1')
        expect(result.modelId).toBe(dropdown)
        expect(result.applicationInferenceProfile).toBeUndefined()
    })

    it('falls back to dropdown when customModel is undefined', async () => {
        const result = await resolveBedrockModel(undefined, dropdown, 'us-east-1')
        expect(result.modelId).toBe(dropdown)
        expect(result.applicationInferenceProfile).toBeUndefined()
    })

    it('model not in map gets no profile', async () => {
        const result = await resolveBedrockModel('google.gemma-3-4b-it', dropdown, 'us-east-1')
        expect(result.modelId).toBe('google.gemma-3-4b-it')
        expect(result.applicationInferenceProfile).toBeUndefined()
    })

    // --- explicit user-supplied profiles (passthrough) ---
    it('detects explicit us. profile in customModel', async () => {
        const result = await resolveBedrockModel('us.anthropic.claude-sonnet-4-6', dropdown, 'us-east-1')
        expect(result.modelId).toBe('anthropic.claude-sonnet-4-6')
        expect(result.applicationInferenceProfile).toBe('us.anthropic.claude-sonnet-4-6')
    })

    it('detects explicit eu. profile in customModel', async () => {
        const result = await resolveBedrockModel('eu.anthropic.claude-sonnet-4-6', dropdown, 'eu-west-1')
        expect(result.applicationInferenceProfile).toBe('eu.anthropic.claude-sonnet-4-6')
    })

    it('detects explicit apac. profile in customModel', async () => {
        const result = await resolveBedrockModel('apac.amazon.nova-pro-v1:0', dropdown, 'ap-southeast-1')
        expect(result.modelId).toBe('amazon.nova-pro-v1:0')
        expect(result.applicationInferenceProfile).toBe('apac.amazon.nova-pro-v1:0')
    })

    it('detects explicit jp. profile in customModel', async () => {
        const result = await resolveBedrockModel('jp.anthropic.claude-sonnet-4-6', dropdown, 'ap-northeast-1')
        expect(result.modelId).toBe('anthropic.claude-sonnet-4-6')
        expect(result.applicationInferenceProfile).toBe('jp.anthropic.claude-sonnet-4-6')
    })

    it('detects explicit au. profile in customModel', async () => {
        const result = await resolveBedrockModel('au.anthropic.claude-sonnet-4-6', dropdown, 'ap-southeast-2')
        expect(result.modelId).toBe('anthropic.claude-sonnet-4-6')
        expect(result.applicationInferenceProfile).toBe('au.anthropic.claude-sonnet-4-6')
    })

    it('detects explicit ca. profile in customModel', async () => {
        const result = await resolveBedrockModel('ca.amazon.nova-lite-v1:0', dropdown, 'ca-central-1')
        expect(result.modelId).toBe('amazon.nova-lite-v1:0')
        expect(result.applicationInferenceProfile).toBe('ca.amazon.nova-lite-v1:0')
    })

    it('detects explicit global. profile in customModel', async () => {
        const result = await resolveBedrockModel('global.anthropic.claude-opus-4-5-20251101-v1:0', dropdown, 'us-east-1')
        expect(result.modelId).toBe('anthropic.claude-opus-4-5-20251101-v1:0')
        expect(result.applicationInferenceProfile).toBe('global.anthropic.claude-opus-4-5-20251101-v1:0')
    })

    it('detects a full ARN', async () => {
        const arn = 'arn:aws:bedrock:us-east-1:123456789012:inference-profile/abc'
        const result = await resolveBedrockModel(arn, dropdown, 'us-east-1')
        expect(result.modelId).toBe(dropdown)
        expect(result.applicationInferenceProfile).toBe(arn)
    })

    // --- auto-apply: US region ---
    it('auto-applies us. profile in us-east-1', async () => {
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'us-east-1')
        expect(result.applicationInferenceProfile).toBe('us.anthropic.claude-sonnet-4-6')
    })

    it('auto-applies us. for Nova in us-west-2', async () => {
        const result = await resolveBedrockModel('', 'amazon.nova-pro-v1:0', 'us-west-2')
        expect(result.applicationInferenceProfile).toBe('us.amazon.nova-pro-v1:0')
    })

    // --- auto-apply: EU region ---
    it('auto-applies eu. profile when in eu-west-1 and model has eu', async () => {
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'eu-west-1')
        expect(result.applicationInferenceProfile).toBe('eu.anthropic.claude-sonnet-4-6')
    })

    it('auto-applies eu. for Nova Pro in eu-central-1', async () => {
        const result = await resolveBedrockModel('', 'amazon.nova-pro-v1:0', 'eu-central-1')
        expect(result.applicationInferenceProfile).toBe('eu.amazon.nova-pro-v1:0')
    })

    // --- auto-apply: APAC region (ap-southeast-1 → apac) ---
    it('auto-applies apac. profile when in ap-southeast-1 and model has apac', async () => {
        const result = await resolveBedrockModel('', 'amazon.nova-pro-v1:0', 'ap-southeast-1')
        expect(result.applicationInferenceProfile).toBe('apac.amazon.nova-pro-v1:0')
    })

    // --- auto-apply: Tokyo (ap-northeast-1 → jp preferred, apac fallback) ---
    it('auto-applies jp. in ap-northeast-1 when model has jp', async () => {
        // claude-sonnet-4-6 has ['us','eu','jp','global'] → jp matches first
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'ap-northeast-1')
        expect(result.applicationInferenceProfile).toBe('jp.anthropic.claude-sonnet-4-6')
    })

    it('falls back to apac. in ap-northeast-1 when model has apac but not jp', async () => {
        // nova-pro has ['us','eu','apac'] → jp not found, apac matches
        const result = await resolveBedrockModel('', 'amazon.nova-pro-v1:0', 'ap-northeast-1')
        expect(result.applicationInferenceProfile).toBe('apac.amazon.nova-pro-v1:0')
    })

    // --- auto-apply: Osaka (ap-northeast-3 → jp, same as Tokyo) ---
    it('auto-applies jp. in ap-northeast-3 (Osaka) same as Tokyo', async () => {
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'ap-northeast-3')
        expect(result.applicationInferenceProfile).toBe('jp.anthropic.claude-sonnet-4-6')
    })

    // --- auto-apply: Sydney (ap-southeast-2 → au preferred, apac fallback) ---
    it('auto-applies au. in ap-southeast-2 when model has au', async () => {
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'ap-southeast-2')
        expect(result.applicationInferenceProfile).toBe('au.anthropic.claude-sonnet-4-6')
    })

    it('falls back to apac. in ap-southeast-2 when model has apac but not au', async () => {
        // nova-pro has ['us','eu','apac'] → au not found, apac matches
        const result = await resolveBedrockModel('', 'amazon.nova-pro-v1:0', 'ap-southeast-2')
        expect(result.applicationInferenceProfile).toBe('apac.amazon.nova-pro-v1:0')
    })

    // --- fallback chain ---
    it('falls back to global. when preferred geo not available', async () => {
        // claude-opus-4-5 has ['us','eu','global'] but NOT apac or jp
        const result = await resolveBedrockModel('', 'anthropic.claude-opus-4-5-20251101-v1:0', 'ap-southeast-1')
        expect(result.applicationInferenceProfile).toBe('global.anthropic.claude-opus-4-5-20251101-v1:0')
    })

    it('falls back to global. in ap-northeast-1 when model has neither jp nor apac', async () => {
        // claude-opus-4-5 has ['us','eu','global'] → jp miss, apac miss, global matches
        const result = await resolveBedrockModel('', 'anthropic.claude-opus-4-5-20251101-v1:0', 'ap-northeast-1')
        expect(result.applicationInferenceProfile).toBe('global.anthropic.claude-opus-4-5-20251101-v1:0')
    })

    // --- South America (sa-east-1 → only global profiles available) ---
    it('falls back to global. in sa-east-1 (no sa. profiles exist)', async () => {
        // claude-sonnet-4-6 has ['us','eu','jp','global'] → no SA candidates, global matches
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'sa-east-1')
        expect(result.applicationInferenceProfile).toBe('global.anthropic.claude-sonnet-4-6')
    })

    it('falls back to us. in sa-east-1 when model has no global', async () => {
        // meta.llama4-scout has ['us'] only → no SA candidates, no global, us matches
        const result = await resolveBedrockModel('', 'meta.llama4-scout-17b-instruct-v1:0', 'sa-east-1')
        expect(result.applicationInferenceProfile).toBe('us.meta.llama4-scout-17b-instruct-v1:0')
    })

    // --- Canada (ca-central-1 → ca preferred, then us fallback) ---
    it('auto-applies ca. in ca-central-1 when model has ca', async () => {
        // nova-lite has ['us','eu','apac','ca'] → ca matches first
        const result = await resolveBedrockModel('', 'amazon.nova-lite-v1:0', 'ca-central-1')
        expect(result.applicationInferenceProfile).toBe('ca.amazon.nova-lite-v1:0')
    })

    it('falls back to us. in ca-central-1 when model has no ca', async () => {
        // claude-sonnet-4-6 has ['us','eu','jp','global'] → ca miss, us matches
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'ca-central-1')
        expect(result.applicationInferenceProfile).toBe('us.anthropic.claude-sonnet-4-6')
    })

    it('falls back to us. when neither preferred geo nor global available', async () => {
        // meta.llama4-scout has ['us'] only
        const result = await resolveBedrockModel('', 'meta.llama4-scout-17b-instruct-v1:0', 'eu-west-1')
        expect(result.applicationInferenceProfile).toBe('us.meta.llama4-scout-17b-instruct-v1:0')
    })

    it('falls back to us. for deepseek in apac region (us only model)', async () => {
        const result = await resolveBedrockModel('', 'deepseek.r1-v1:0', 'ap-northeast-1')
        expect(result.applicationInferenceProfile).toBe('us.deepseek.r1-v1:0')
    })

    // --- no profile models ---
    it('does NOT auto-apply profile for MiniMax', async () => {
        const result = await resolveBedrockModel('', 'minimax.minimax-m2', 'us-east-1')
        expect(result.applicationInferenceProfile).toBeUndefined()
    })

    it('does NOT auto-apply profile for NVIDIA', async () => {
        const result = await resolveBedrockModel('', 'nvidia.nemotron-nano-9b-v2', 'us-east-1')
        expect(result.applicationInferenceProfile).toBeUndefined()
    })

    it('does NOT auto-apply profile for Qwen', async () => {
        const result = await resolveBedrockModel('', 'qwen.qwen3-32b-v1:0', 'us-east-1')
        expect(result.applicationInferenceProfile).toBeUndefined()
    })

    // --- explicit profile overrides auto ---
    it('does not override explicit profile with auto-mapping', async () => {
        const result = await resolveBedrockModel('eu.anthropic.claude-sonnet-4-6', 'anthropic.claude-sonnet-4-6', 'us-east-1')
        expect(result.applicationInferenceProfile).toBe('eu.anthropic.claude-sonnet-4-6')
    })

    // --- misc ---
    it('trims whitespace from customModel', async () => {
        const result = await resolveBedrockModel('  amazon.nova-pro-v1:0  ', dropdown, 'us-east-1')
        expect(result.modelId).toBe('amazon.nova-pro-v1:0')
    })

    it('defaults to us-east-1 when region not provided', async () => {
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6')
        expect(result.applicationInferenceProfile).toBe('us.anthropic.claude-sonnet-4-6')
    })

    // --- model loader failure gracefully degrades ---
    it('returns no profile when model loader fails', async () => {
        const { getModels } = require('../../../src/modelLoader')
        getModels.mockRejectedValueOnce(new Error('Network error'))
        _resetInferenceProfileCache()
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'us-east-1')
        expect(result.modelId).toBe('anthropic.claude-sonnet-4-6')
        expect(result.applicationInferenceProfile).toBeUndefined()
    })

    // --- runtime discovery: availableProfiles parameter ---
    it('applies profile when confirmed available in region', async () => {
        const available = new Set(['eu.anthropic.claude-sonnet-4-6', 'global.anthropic.claude-sonnet-4-6'])
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'eu-west-1', available)
        expect(result.applicationInferenceProfile).toBe('eu.anthropic.claude-sonnet-4-6')
    })

    it('skips profile when NOT available in region, falls back to global', async () => {
        // eu-west-2 has global but NOT eu.amazon.nova-pro
        const available = new Set(['global.amazon.nova-2-lite-v1:0', 'eu.anthropic.claude-sonnet-4-6'])
        const result = await resolveBedrockModel('', 'amazon.nova-pro-v1:0', 'eu-west-2', available)
        // nova-pro has geos ['us','eu','apac'] — eu. not in available, no global for this model, try us.
        // us.amazon.nova-pro not in available either → no profile (direct invocation)
        expect(result.applicationInferenceProfile).toBeUndefined()
    })

    it('falls back to global. when eu. not available but global. is', async () => {
        const available = new Set(['global.amazon.nova-2-lite-v1:0'])
        const result = await resolveBedrockModel('', 'amazon.nova-2-lite-v1:0', 'eu-west-2', available)
        expect(result.applicationInferenceProfile).toBe('global.amazon.nova-2-lite-v1:0')
    })

    it('still applies explicit profile from customModel regardless of availableProfiles', async () => {
        const available = new Set<string>() // empty — nothing available
        const result = await resolveBedrockModel('eu.anthropic.claude-sonnet-4-6', 'anthropic.claude-sonnet-4-6', 'eu-west-2', available)
        // Explicit profile bypasses runtime check
        expect(result.applicationInferenceProfile).toBe('eu.anthropic.claude-sonnet-4-6')
    })
})

// ---------------------------------------------------------------------------
// useGlobalEndpoint override
// ---------------------------------------------------------------------------
describe('useGlobalEndpoint override', () => {
    beforeEach(() => {
        _resetInferenceProfileCache()
    })

    it('forces global.* when useGlobalEndpoint=true and model has global geo', async () => {
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'eu-west-1', undefined, true)
        expect(result.applicationInferenceProfile).toBe('global.anthropic.claude-sonnet-4-6')
    })

    it('falls back to regional when useGlobalEndpoint=true but model has no global geo', async () => {
        const result = await resolveBedrockModel('', 'amazon.nova-pro-v1:0', 'eu-west-1', undefined, true)
        // nova-pro geos: us, eu, apac — no global. Should fall back to eu.
        expect(result.applicationInferenceProfile).toBe('eu.amazon.nova-pro-v1:0')
    })

    it('uses normal regional selection when useGlobalEndpoint=false', async () => {
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'eu-west-1', undefined, false)
        expect(result.applicationInferenceProfile).toBe('eu.anthropic.claude-sonnet-4-6')
    })

    it('uses normal regional selection when useGlobalEndpoint=undefined', async () => {
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'ap-northeast-1', undefined, undefined)
        expect(result.applicationInferenceProfile).toBe('jp.anthropic.claude-sonnet-4-6')
    })

    it('global override with runtime discovery validates profile exists', async () => {
        const available = new Set(['global.anthropic.claude-sonnet-4-6'])
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'eu-west-1', available, true)
        expect(result.applicationInferenceProfile).toBe('global.anthropic.claude-sonnet-4-6')
    })

    it('global override with runtime discovery falls back when global not in region', async () => {
        const available = new Set(['eu.anthropic.claude-sonnet-4-6']) // global not available
        const result = await resolveBedrockModel('', 'anthropic.claude-sonnet-4-6', 'eu-west-1', available, true)
        // global not in available set, allCandidateGeos is just ['global'], nothing matches
        expect(result.applicationInferenceProfile).toBeUndefined()
    })

    it('does not affect models with no inference profiles', async () => {
        const result = await resolveBedrockModel('', 'minimax.minimax-m2', 'us-east-1', undefined, true)
        expect(result.applicationInferenceProfile).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// getStopSeqUnsupportedModels
// ---------------------------------------------------------------------------

describe('getStopSeqUnsupportedModels', () => {
    it('returns models with stop_sequences: false', async () => {
        const set = await getStopSeqUnsupportedModels()
        expect(set.has('deepseek.v3.2')).toBe(true)
        expect(set.has('deepseek.r1-v1:0')).toBe(true)
        expect(set.has('openai.gpt-oss-20b-1:0')).toBe(true)
        expect(set.has('openai.gpt-oss-safeguard-20b')).toBe(true)
    })

    it('does NOT include models without the flag', async () => {
        const set = await getStopSeqUnsupportedModels()
        expect(set.has('anthropic.claude-sonnet-4-6')).toBe(false)
        expect(set.has('amazon.nova-pro-v1:0')).toBe(false)
        expect(set.has('minimax.minimax-m2')).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// normalizeBedrockError
// ---------------------------------------------------------------------------

describe('normalizeBedrockError', () => {
    it('rewrites inference-profile-required errors', () => {
        const err = new Error(
            "ValidationException: Invocation of model ID anthropic.claude-sonnet-4-6 with on-demand throughput isn't supported."
        )
        const result = normalizeBedrockError(err)
        expect(result.message).toContain('inference profile')
        expect(result.message).toContain('Model Name')
    })

    it('rewrites Converse-unsupported errors', () => {
        const err = new Error("This model doesn't support the Converse operation")
        const result = normalizeBedrockError(err)
        expect(result.message).toContain('InvokeModel')
        expect(result.message).toContain('Custom Model ARN')
    })

    it('rewrites unsupported-field errors', () => {
        const err = new Error("This model doesn't support the stopSequences field")
        const result = normalizeBedrockError(err)
        expect(result.message).toContain('request parameter')
    })

    it('returns unrecognized errors unchanged', () => {
        const err = new Error('Some other random error')
        const result = normalizeBedrockError(err)
        expect(result).toBe(err)
    })

    it('handles non-Error values', () => {
        const result = normalizeBedrockError('string error' as any)
        expect(result).toBe('string error')
    })
})

// ---------------------------------------------------------------------------
// BedrockChat error normalization wiring
// ---------------------------------------------------------------------------

describe('BedrockChat error normalization wiring', () => {
    let BedrockChat: any

    beforeAll(async () => {
        // Dynamic import to pick up the jest mock for modelLoader
        const mod = await import('./FlowiseAWSChatBedrock')
        BedrockChat = mod.BedrockChat
    })

    it('_generate normalizes inference-profile-required errors', async () => {
        const chat = new BedrockChat('test-id', { model: 'anthropic.claude-sonnet-4-6', region: 'us-east-1' })

        // Mock the parent _generate to throw a raw Bedrock error
        const originalGenerate = Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate
        Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate = jest
            .fn()
            .mockRejectedValue(
                new Error(
                    "ValidationException: Invocation of model ID anthropic.claude-sonnet-4-6 with on-demand throughput isn't supported."
                )
            )

        try {
            await chat._generate([], {})
            fail('Expected error to be thrown')
        } catch (err: any) {
            expect(err.message).toContain('cross-region inference profile')
            expect(err.message).toContain('Model Name')
        }

        // Restore
        Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate = originalGenerate
    })

    it('_generate normalizes Converse-unsupported errors', async () => {
        const chat = new BedrockChat('test-id', { model: 'custom-model', region: 'us-east-1' })

        const originalGenerate = Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate
        Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate = jest
            .fn()
            .mockRejectedValue(new Error("This model doesn't support the Converse operation"))

        try {
            await chat._generate([], {})
            fail('Expected error to be thrown')
        } catch (err: any) {
            expect(err.message).toContain('InvokeModel')
            expect(err.message).toContain('Custom Model ARN')
        }

        Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate = originalGenerate
    })

    it('_generate passes through unrecognized errors unchanged', async () => {
        const chat = new BedrockChat('test-id', { model: 'some-model', region: 'us-east-1' })

        const rawError = new Error('Something completely unexpected')
        const originalGenerate = Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate
        Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate = jest.fn().mockRejectedValue(rawError)

        try {
            await chat._generate([], {})
            fail('Expected error to be thrown')
        } catch (err: any) {
            expect(err).toBe(rawError)
        }

        Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate = originalGenerate
    })

    it('_generate does not interfere with successful responses', async () => {
        const chat = new BedrockChat('test-id', { model: 'some-model', region: 'us-east-1' })

        const mockResult = { generations: [{ text: 'hello', message: { content: 'hello' } }] }
        const originalGenerate = Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate
        Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate = jest.fn().mockResolvedValue(mockResult)

        const result = await chat._generate([], {})
        expect(result).toBe(mockResult)

        Object.getPrototypeOf(Object.getPrototypeOf(chat))._generate = originalGenerate
    })

    it('stopSeqUnsupported strips stopSequences for flagged models', () => {
        const unsupported = new Set(['deepseek.r1-v1:0'])
        const chat = new BedrockChat('test-id', { model: 'deepseek.r1-v1:0', region: 'us-east-1' }, unsupported)

        // Mock super.invocationParams to return params with stopSequences
        const originalInvocationParams = Object.getPrototypeOf(Object.getPrototypeOf(chat)).invocationParams
        Object.getPrototypeOf(Object.getPrototypeOf(chat)).invocationParams = jest.fn().mockReturnValue({
            inferenceConfig: { maxTokens: 200, stopSequences: ['\\n'] }
        })

        const params = chat.invocationParams({})
        expect(params.inferenceConfig.stopSequences).toBeUndefined()
        expect(params.inferenceConfig.maxTokens).toBe(200)

        Object.getPrototypeOf(Object.getPrototypeOf(chat)).invocationParams = originalInvocationParams
    })

    it('stopSeqUnsupported keeps stopSequences for non-flagged models', () => {
        const unsupported = new Set(['deepseek.r1-v1:0'])
        const chat = new BedrockChat('test-id', { model: 'anthropic.claude-sonnet-4-6', region: 'us-east-1' }, unsupported)

        const originalInvocationParams = Object.getPrototypeOf(Object.getPrototypeOf(chat)).invocationParams
        Object.getPrototypeOf(Object.getPrototypeOf(chat)).invocationParams = jest.fn().mockReturnValue({
            inferenceConfig: { maxTokens: 200, stopSequences: ['\\n'] }
        })

        const params = chat.invocationParams({})
        expect(params.inferenceConfig.stopSequences).toEqual(['\\n'])

        Object.getPrototypeOf(Object.getPrototypeOf(chat)).invocationParams = originalInvocationParams
    })
})

// ---------------------------------------------------------------------------
// Imported model auto-detection — ARN pattern matching
// ---------------------------------------------------------------------------
describe('Imported model ARN detection', () => {
    it('matches imported-model ARNs', () => {
        expect('arn:aws:bedrock:us-east-1:123456789000:imported-model/s8s5k3tqgk1b'.includes(':imported-model/')).toBe(true)
    })

    it('does not match provisioned-model ARNs', () => {
        expect('arn:aws:bedrock:us-east-1:123456789000:provisioned-model/my-pt'.includes(':imported-model/')).toBe(false)
    })

    it('does not match inference-profile ARNs', () => {
        expect('arn:aws:bedrock:us-east-1:123456789000:inference-profile/abc'.includes(':imported-model/')).toBe(false)
    })

    it('does not match plain model IDs', () => {
        expect('anthropic.claude-sonnet-4-6'.includes(':imported-model/')).toBe(false)
    })

    it('does not match geo-prefixed inference profile IDs', () => {
        expect('us.anthropic.claude-sonnet-4-6'.includes(':imported-model/')).toBe(false)
    })

    it('does not match custom-model (fine-tuned) ARNs', () => {
        expect('arn:aws:bedrock:us-east-1:123456789000:custom-model/my-ft'.includes(':imported-model/')).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// Imported model auto-detection — full init() routing
//
// These tests verify that the Converse node's init() correctly routes to
// BedrockImportedChat or BedrockChat depending on the model type.
// ---------------------------------------------------------------------------
describe('Converse node init() routing for custom models', () => {
    // We can't easily call init() directly (it needs INodeData, options, etc.),
    // so we test the routing logic extracted into a helper that mirrors init().
    // This function replicates the decision tree in AWSChatBedrock.ts init().
    function simulateInitRouting(params: {
        customModel?: string
        endpointHost?: string
        instructSupported?: boolean
        supportedFormats?: string[]
    }): 'BedrockImportedChat' | 'BedrockChat' | 'ValidationError' {
        let endpointMigratedArn: string | undefined
        if (params.endpointHost) {
            const result = validateEndpointHost(params.endpointHost)
            endpointMigratedArn = result.migratedArn
        }

        const effectiveModel = endpointMigratedArn || params.customModel
        if (effectiveModel && !effectiveModel.startsWith('arn:aws:bedrock:')) {
            return 'ValidationError'
        }
        if (effectiveModel?.includes(':imported-model/')) {
            if (params.instructSupported !== true) {
                return 'BedrockImportedChat'
            }
        }
        return 'BedrockChat'
    }

    // --- Imported model ARN in customModel ---

    it('imported ARN + instructSupported:false → BedrockImportedChat', () => {
        expect(
            simulateInitRouting({
                customModel: 'arn:aws:bedrock:us-east-1:123:imported-model/xyz',
                instructSupported: false
            })
        ).toBe('BedrockImportedChat')
    })

    it('imported ARN + instructSupported:undefined → BedrockImportedChat', () => {
        expect(
            simulateInitRouting({
                customModel: 'arn:aws:bedrock:us-east-1:123:imported-model/xyz',
                instructSupported: undefined
            })
        ).toBe('BedrockImportedChat')
    })

    it('imported ARN + instructSupported:true → BedrockChat (Converse)', () => {
        expect(
            simulateInitRouting({
                customModel: 'arn:aws:bedrock:us-east-1:123:imported-model/xyz',
                instructSupported: true
            })
        ).toBe('BedrockChat')
    })

    // --- Imported model ARN via endpointHost auto-migration ---

    it('imported ARN in endpointHost + instructSupported:false → BedrockImportedChat', () => {
        expect(
            simulateInitRouting({
                endpointHost: 'arn:aws:bedrock:us-east-1:123:imported-model/xyz',
                instructSupported: false
            })
        ).toBe('BedrockImportedChat')
    })

    it('imported ARN in endpointHost overrides customModel', () => {
        expect(
            simulateInitRouting({
                customModel: 'anthropic.claude-sonnet-4-6',
                endpointHost: 'arn:aws:bedrock:us-east-1:123:imported-model/xyz',
                instructSupported: false
            })
        ).toBe('BedrockImportedChat')
    })

    // --- Non-imported model types → always Converse ---

    it('provisioned-model ARN → BedrockChat', () => {
        expect(
            simulateInitRouting({
                customModel: 'arn:aws:bedrock:us-east-1:123:provisioned-model/my-pt'
            })
        ).toBe('BedrockChat')
    })

    it('inference-profile ARN → BedrockChat', () => {
        expect(
            simulateInitRouting({
                customModel: 'arn:aws:bedrock:us-east-1:123:inference-profile/abc'
            })
        ).toBe('BedrockChat')
    })

    it('custom-model (fine-tuned) ARN → BedrockChat', () => {
        expect(
            simulateInitRouting({
                customModel: 'arn:aws:bedrock:us-east-1:123:custom-model/my-ft'
            })
        ).toBe('BedrockChat')
    })

    it('geo-prefixed inference profile in customModel → ValidationError (use dropdown)', () => {
        expect(
            simulateInitRouting({
                customModel: 'us.anthropic.claude-sonnet-4-6'
            })
        ).toBe('ValidationError')
    })

    it('plain model ID in customModel → ValidationError (use dropdown)', () => {
        expect(
            simulateInitRouting({
                customModel: 'anthropic.claude-sonnet-4-6'
            })
        ).toBe('ValidationError')
    })

    it('empty customModel → BedrockChat (dropdown fallback)', () => {
        expect(
            simulateInitRouting({
                customModel: ''
            })
        ).toBe('BedrockChat')
    })

    it('undefined customModel → BedrockChat', () => {
        expect(
            simulateInitRouting({
                customModel: undefined
            })
        ).toBe('BedrockChat')
    })

    it('bare hostname in endpointHost (not ARN) → BedrockChat', () => {
        expect(
            simulateInitRouting({
                endpointHost: 'bedrock-runtime.us-east-1.amazonaws.com'
            })
        ).toBe('BedrockChat')
    })

    // --- Input validation: reject model names that aren't ARNs ---

    it('model name (not ARN) → ValidationError', () => {
        expect(simulateInitRouting({ customModel: 'SantaCoder-1B' })).toBe('ValidationError')
    })

    it('model name with trailing dot → ValidationError', () => {
        expect(simulateInitRouting({ customModel: 'jcvze99n15u4.' })).toBe('ValidationError')
    })

    it('bare hash ID → ValidationError', () => {
        expect(simulateInitRouting({ customModel: 'jcvze99n15u4' })).toBe('ValidationError')
    })

    it('built-in model ID (use dropdown instead) → ValidationError', () => {
        expect(simulateInitRouting({ customModel: 'anthropic.claude-sonnet-4-6' })).toBe('ValidationError')
    })

    it('geo-prefixed ID (auto-applied, not manual) → ValidationError', () => {
        expect(simulateInitRouting({ customModel: 'us.anthropic.claude-sonnet-4-6' })).toBe('ValidationError')
    })

    it('random string → ValidationError', () => {
        expect(simulateInitRouting({ customModel: 'My Custom Model' })).toBe('ValidationError')
    })

    it('valid imported-model ARN → accepted', () => {
        expect(simulateInitRouting({ customModel: 'arn:aws:bedrock:us-east-1:123:imported-model/xyz', instructSupported: false })).toBe(
            'BedrockImportedChat'
        )
    })

    it('valid provisioned-model ARN → accepted', () => {
        expect(simulateInitRouting({ customModel: 'arn:aws:bedrock:us-east-1:123:provisioned-model/xyz' })).toBe('BedrockChat')
    })
})

// ---------------------------------------------------------------------------
// Format detection for imported models
// ---------------------------------------------------------------------------
describe('detectFormat for imported models', () => {
    it('prefers openai-chat-completion when ChatCompletionRequest available', () => {
        expect(detectFormat(['chatcompletionrequest', 'bedrockmetacompletionrequest'])).toBe('openai-chat-completion')
    })

    it('returns bedrock-completion when only prompt-based formats exist', () => {
        expect(detectFormat(['completionrequest'])).toBe('bedrock-completion')
    })

    it('returns bedrock-completion when only BedrockCompletionRequest exists', () => {
        expect(detectFormat(['bedrockcompletionrequest'])).toBe('bedrock-completion')
    })

    it('defaults to openai-chat-completion when no formats provided', () => {
        expect(detectFormat(undefined)).toBe('openai-chat-completion')
    })

    it('defaults to openai-chat-completion for empty array', () => {
        expect(detectFormat([])).toBe('openai-chat-completion')
    })
})
