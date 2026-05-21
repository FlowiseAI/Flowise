import { FileReference, SkillBundleEntry, SkillKind, ToolDependency, ToolReference } from '../entities'
import { propagate } from './transitivePropagator'

// ---------------------------------------------------------------------------
// Helpers — minimal entry shells just for propagation tests.
// ---------------------------------------------------------------------------

const dep = (provider: string, toolName: string): ToolDependency => ({ type: 'custom', provider, toolName })

const ref = (provider: string, toolName: string, uuid: string): ToolReference => ({
    type: 'custom',
    provider,
    toolName,
    uuid,
    enabled: true
})

const fileRef = (nodeId: string): FileReference => ({ source: 'app', nodeId })

const entry = (
    nodeId: string,
    kind: SkillKind,
    overrides: {
        deps?: ToolDependency[]
        refs?: ToolReference[]
        files?: FileReference[]
    } = {}
): SkillBundleEntry => ({
    nodeId,
    kind,
    name: nodeId,
    path: `${nodeId}.md`,
    source: { nodeId, contentDigest: 'digest' },
    tools: { dependencies: overrides.deps ?? [], references: overrides.refs ?? [] },
    files: { references: overrides.files ?? [] },
    content: ''
})

// ---------------------------------------------------------------------------
// Direct propagation
// ---------------------------------------------------------------------------

describe('propagate — direct edges', () => {
    it('copies tool deps + references + file refs from a single dependency', () => {
        const entries: Record<string, SkillBundleEntry> = {
            consumer: entry('consumer', 'skill'),
            producer: entry('producer', 'skill', {
                deps: [dep('hr_platform', 'candidate_lookup')],
                refs: [ref('hr_platform', 'candidate_lookup', 'uuid-1')],
                files: [fileRef('jd')]
            })
        }
        const graph = { consumer: ['producer'], producer: [] }

        propagate(entries, graph)

        expect(entries.consumer.tools.dependencies).toEqual([dep('hr_platform', 'candidate_lookup')])
        expect(entries.consumer.tools.references).toEqual([ref('hr_platform', 'candidate_lookup', 'uuid-1')])
        expect(entries.consumer.files.references).toEqual([fileRef('jd')])
    })

    it('does not double-add deps that the consumer already declares', () => {
        const direct = dep('hr_platform', 'candidate_lookup')
        const entries: Record<string, SkillBundleEntry> = {
            consumer: entry('consumer', 'skill', { deps: [direct] }),
            producer: entry('producer', 'skill', { deps: [direct] })
        }
        propagate(entries, { consumer: ['producer'], producer: [] })
        expect(entries.consumer.tools.dependencies).toHaveLength(1)
    })
})

// ---------------------------------------------------------------------------
// Multi-hop transitive merge — modelled on the recruiting scenario in
// docs/example-testing/. Email-drafter depends on the screener and the
// interview-questions skill; after propagation it must inherit
// `candidate_lookup` (from screener) and `python` (from interviewer) on top
// of its own `send_email`.
// ---------------------------------------------------------------------------

describe('propagate — recruiting-style two-hop graph', () => {
    it('merges transitive tool deps from grandchildren to grandparents', () => {
        const entries: Record<string, SkillBundleEntry> = {
            screener: entry('screener', 'skill', {
                deps: [dep('hr_platform', 'candidate_lookup')],
                refs: [ref('hr_platform', 'candidate_lookup', 'uuid-cl')],
                files: [fileRef('jd'), fileRef('score')]
            }),
            interviewer: entry('interviewer', 'skill', {
                deps: [dep('sandbox', 'python')],
                refs: [ref('sandbox', 'python', 'uuid-py')],
                files: [fileRef('screener')]
            }),
            emailer: entry('emailer', 'skill', {
                deps: [dep('comms', 'send_email')],
                refs: [ref('comms', 'send_email', 'uuid-em')],
                files: [fileRef('screener'), fileRef('interviewer')]
            }),
            jd: entry('jd', 'data'),
            score: entry('score', 'code')
        }

        const graph = {
            screener: [],
            interviewer: ['screener'],
            emailer: ['screener', 'interviewer'],
            jd: [],
            score: []
        }

        propagate(entries, graph)

        const triples = (e: SkillBundleEntry) => e.tools.dependencies.map((d) => `${d.provider}.${d.toolName}`)
        expect(triples(entries.screener)).toEqual(['hr_platform.candidate_lookup'])
        expect(triples(entries.interviewer).sort()).toEqual(['hr_platform.candidate_lookup', 'sandbox.python'])
        expect(triples(entries.emailer).sort()).toEqual(['comms.send_email', 'hr_platform.candidate_lookup', 'sandbox.python'])

        // Refs propagate by the (type, provider, toolName, uuid) tuple.
        expect(entries.emailer.tools.references.map((r) => r.uuid).sort()).toEqual(['uuid-cl', 'uuid-em', 'uuid-py'])

        // File refs must be deduped on the (source, nodeId) tuple.
        const fileIds = entries.emailer.files.references.map((f) => f.nodeId).sort()
        expect(fileIds).toEqual(['interviewer', 'jd', 'score', 'screener'])
    })
})

// ---------------------------------------------------------------------------
// Robustness — order independence, idempotency, cycle tolerance
// ---------------------------------------------------------------------------

describe('propagate — robustness', () => {
    it('is idempotent — a second propagation pass changes nothing', () => {
        const entries: Record<string, SkillBundleEntry> = {
            a: entry('a', 'skill', { deps: [dep('p', 'one')] }),
            b: entry('b', 'skill', { deps: [dep('p', 'two')] }),
            c: entry('c', 'skill')
        }
        const graph = { a: [], b: ['a'], c: ['b'] }

        propagate(entries, graph)
        const firstPass = JSON.stringify(entries.c.tools.dependencies)
        propagate(entries, graph)
        const secondPass = JSON.stringify(entries.c.tools.dependencies)
        expect(secondPass).toBe(firstPass)
    })

    it('tolerates cycles via the monotonic merge — both nodes converge to the union', () => {
        const entries: Record<string, SkillBundleEntry> = {
            a: entry('a', 'skill', { deps: [dep('p', 'a-tool')] }),
            b: entry('b', 'skill', { deps: [dep('p', 'b-tool')] })
        }
        // a → b → a (cycle).
        propagate(entries, { a: ['b'], b: ['a'] })
        const aTriples = entries.a.tools.dependencies.map((d) => d.toolName).sort()
        const bTriples = entries.b.tools.dependencies.map((d) => d.toolName).sort()
        expect(aTriples).toEqual(['a-tool', 'b-tool'])
        expect(bTriples).toEqual(['a-tool', 'b-tool'])
    })

    it('skips entries that point at missing dependencies', () => {
        const entries: Record<string, SkillBundleEntry> = {
            a: entry('a', 'skill')
        }
        propagate(entries, { a: ['ghost'] })
        expect(entries.a.tools.dependencies).toEqual([])
        expect(entries.a.files.references).toEqual([])
    })

    it('does nothing when a graph entry has no corresponding bundle entry', () => {
        const entries: Record<string, SkillBundleEntry> = {
            a: entry('a', 'skill', { deps: [dep('p', 'x')] })
        }
        // graph mentions `phantom` but `entries[phantom]` is missing — must not throw.
        propagate(entries, { a: [], phantom: ['a'] })
        expect(entries.a.tools.dependencies).toHaveLength(1)
    })
})
