import { SkillBundle, SkillBundleEntry, SkillKind, ToolDependency, ToolReference } from '../entities'
import { derivePolicy } from './ToolAccessPolicy'

// =============================================================================
// Fixture helpers
// =============================================================================

const dep = (provider: string, toolName: string, type: ToolDependency['type'] = 'custom'): ToolDependency => ({ type, provider, toolName })

const ref = (provider: string, toolName: string, uuid: string, type: ToolReference['type'] = 'custom'): ToolReference => ({
    type,
    provider,
    toolName,
    uuid,
    enabled: true
})

const skillEntry = (
    nodeId: string,
    overrides: { deps?: ToolDependency[]; refs?: ToolReference[]; kind?: SkillKind } = {}
): SkillBundleEntry => ({
    nodeId,
    kind: overrides.kind ?? 'skill',
    name: nodeId,
    path: `${nodeId}.md`,
    source: { nodeId, contentDigest: 'd' },
    tools: { dependencies: overrides.deps ?? [], references: overrides.refs ?? [] },
    files: { references: [] },
    content: ''
})

const bundleWith = (entries: SkillBundleEntry[]): SkillBundle => ({
    schemaVersion: 1,
    bundleId: 'b-1',
    workspaceId: 'ws-1',
    skillId: 's-1',
    builtAt: new Date().toISOString(),
    entries: Object.fromEntries(entries.map((e) => [e.nodeId, e])),
    dependencyGraph: {},
    reverseGraph: {}
})

// =============================================================================
// derivePolicy — recruiting-style aggregation
// =============================================================================

describe('derivePolicy — aggregation across entries', () => {
    it('merges deps and refs from every entry when no nodeIds are given', () => {
        const bundle = bundleWith([
            skillEntry('resume', {
                deps: [dep('hr_platform', 'candidate_lookup')],
                refs: [ref('hr_platform', 'candidate_lookup', 'uuid-cl')]
            }),
            skillEntry('interview', {
                deps: [dep('sandbox', 'python')],
                refs: [ref('sandbox', 'python', 'uuid-py')]
            }),
            skillEntry('email', {
                deps: [dep('comms', 'send_email')],
                refs: [ref('comms', 'send_email', 'uuid-em')]
            })
        ])

        const policy = derivePolicy(bundle)
        const triples = policy.dependencies.map((d) => `${d.type}::${d.provider}::${d.toolName}`).sort()
        expect(triples).toEqual(['custom::comms::send_email', 'custom::hr_platform::candidate_lookup', 'custom::sandbox::python'])
        expect(policy.references.map((r) => r.uuid).sort()).toEqual(['uuid-cl', 'uuid-em', 'uuid-py'])
    })

    it('restricts the union to the supplied nodeIds when present', () => {
        const bundle = bundleWith([
            skillEntry('resume', { deps: [dep('hr_platform', 'candidate_lookup')] }),
            skillEntry('interview', { deps: [dep('sandbox', 'python')] }),
            skillEntry('email', { deps: [dep('comms', 'send_email')] })
        ])
        const policy = derivePolicy(bundle, ['resume'])
        expect(policy.dependencies.map((d) => d.toolName)).toEqual(['candidate_lookup'])
    })

    it('falls back to the full bundle when nodeIds is an empty array', () => {
        const bundle = bundleWith([skillEntry('a', { deps: [dep('p', 'tool')] })])
        const policy = derivePolicy(bundle, [])
        expect(policy.dependencies.map((d) => d.toolName)).toEqual(['tool'])
    })
})

// =============================================================================
// derivePolicy — deduplication
// =============================================================================

describe('derivePolicy — deduplication', () => {
    it('dedupes deps by the (type, provider, toolName) triple', () => {
        const bundle = bundleWith([
            skillEntry('a', { deps: [dep('hr_platform', 'candidate_lookup'), dep('hr_platform', 'candidate_lookup')] }),
            skillEntry('b', { deps: [dep('hr_platform', 'candidate_lookup')] })
        ])
        const policy = derivePolicy(bundle)
        expect(policy.dependencies).toHaveLength(1)
    })

    it('treats different reference types as distinct dependencies', () => {
        const bundle = bundleWith([skillEntry('a', { deps: [dep('sandbox', 'python'), dep('sandbox', 'python')] })])
        const policy = derivePolicy(bundle)
        expect(policy.dependencies.map((d) => d.type).sort()).toEqual(['custom'])
    })

    it('dedupes refs by (type, provider, toolName, uuid) — different uuids are kept', () => {
        const bundle = bundleWith([
            skillEntry('a', {
                refs: [ref('p', 'tool', 'uuid-1'), ref('p', 'tool', 'uuid-1'), ref('p', 'tool', 'uuid-2')]
            })
        ])
        const policy = derivePolicy(bundle)
        expect(policy.references.map((r) => r.uuid).sort()).toEqual(['uuid-1', 'uuid-2'])
    })
})

// =============================================================================
// derivePolicy — robustness
// =============================================================================

describe('derivePolicy — robustness', () => {
    it('skips nodeIds missing from bundle.entries', () => {
        const bundle = bundleWith([skillEntry('a', { deps: [dep('p', 'tool')] })])
        const policy = derivePolicy(bundle, ['ghost', 'a'])
        expect(policy.dependencies).toHaveLength(1)
    })

    it('returns an empty policy when every selected entry has no tools', () => {
        const bundle = bundleWith([skillEntry('a'), skillEntry('b')])
        const policy = derivePolicy(bundle)
        expect(policy.dependencies).toEqual([])
        expect(policy.references).toEqual([])
        expect(policy.allowedKeys.size).toBe(0)
    })

    it('considers tool deps from non-skill entries too (even though the compiler never emits them)', () => {
        // If a future change ever moves tool tracking onto data entries, this
        // helper continues to function correctly.
        const bundle = bundleWith([skillEntry('a', { kind: 'data', deps: [dep('p', 'tool')] })])
        const policy = derivePolicy(bundle)
        expect(policy.dependencies.map((d) => d.toolName)).toEqual(['tool'])
    })
})
