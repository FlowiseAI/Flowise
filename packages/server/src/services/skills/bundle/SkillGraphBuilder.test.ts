import { CompileInput, SkillBundle, SkillBundleEntry, SkillDocument, SkillKind, SkillTreeNode } from '../entities'
import { sha256 } from '../utils/digest'
import { BROKEN_REF_MARKER, SkillCompiler } from '../compiler/skillCompiler'
import { buildSkillGraph } from './SkillGraphBuilder'

// =============================================================================
// Fixture helpers — mirror the recruiting scenario in docs/example-testing/.
// =============================================================================

const file = (id: string, name: string, parent_id: string | null = null, order = 0): SkillTreeNode => ({
    id,
    node_type: 'file',
    name,
    parent_id,
    order,
    extension: name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '',
    size: 0
})

const doc = (
    nodeId: string,
    kind: SkillKind,
    filename: string,
    content: string,
    metadata: SkillDocument['metadata'] = { tools: {} }
): SkillDocument => ({
    nodeId,
    kind,
    path: filename,
    filename,
    extension: filename.includes('.') ? filename.slice(filename.lastIndexOf('.') + 1) : '',
    content,
    metadata,
    contentDigest: sha256(content)
})

// Recruiting scenario UUIDs — mirror docs/example-testing/recruiting/.
const IDS = {
    resume: 'resume-screener',
    interview: 'interview-questions',
    email: 'email-drafter',
    jd: 'jd-node',
    score: 'score-node',
    candidate: 'uuid-candidate-lookup',
    python: 'uuid-python-runner',
    sendEmail: 'uuid-send-email'
} as const

const recruitingInput = (): CompileInput => ({
    skillId: 'skill-recruiting',
    workspaceId: 'ws-1',
    fileTree: {
        nodes: [
            file(IDS.resume, 'resume-screener.md'),
            file(IDS.interview, 'interview-questions.md'),
            file(IDS.email, 'email-drafter.md'),
            file(IDS.jd, 'job-description.txt'),
            file(IDS.score, 'scoring_algorithm.js')
        ]
    },
    nodeDocuments: [
        doc(
            IDS.resume,
            'skill',
            'resume-screener.md',
            [
                '# Resume Screening Skill',
                'JD: {{skill.' + IDS.jd + '}}',
                'Scorer: {{skill.' + IDS.score + '}}',
                'Lookup: {{tool.hr_platform.candidate_lookup.' + IDS.candidate + '}}'
            ].join('\n'),
            {
                tools: {
                    [IDS.candidate]: {
                        type: 'custom',
                        provider: 'hr_platform',
                        toolName: 'candidate_lookup',
                        uuid: IDS.candidate,
                        enabled: true
                    }
                }
            }
        ),
        doc(
            IDS.interview,
            'skill',
            'interview-questions.md',
            [
                '# Interview Question Generator',
                'Screening: {{skill.' + IDS.resume + '}}',
                'Code tool: {{tool.sandbox.python.' + IDS.python + '}}'
            ].join('\n')
        ),
        doc(
            IDS.email,
            'skill',
            'email-drafter.md',
            [
                '# Email Drafter',
                'Screening: {{skill.' + IDS.resume + '}}',
                'Plan: {{skill.' + IDS.interview + '}}',
                'Sender: {{tool.comms.send_email.' + IDS.sendEmail + '}}'
            ].join('\n')
        ),
        doc(IDS.jd, 'data', 'job-description.txt', 'JD body…'),
        doc(IDS.score, 'code', 'scoring_algorithm.js', 'console.log("scorer")')
    ]
})

const recruitingBundle = (): SkillBundle => new SkillCompiler().compileAll(recruitingInput())

const toolNodeId = (provider: string, toolName: string) => `tool::${provider}.${toolName}`

// =============================================================================
// File nodes
// =============================================================================

describe('buildSkillGraph — file nodes', () => {
    it('emits one node per bundle entry, including data + code files', () => {
        const graph = buildSkillGraph(recruitingBundle())
        const fileNodeIds = graph.nodes.filter((n) => n.kind !== 'tool').map((n) => n.id)
        expect(fileNodeIds.sort()).toEqual([IDS.email, IDS.interview, IDS.jd, IDS.resume, IDS.score].sort())
    })

    it('records label, kind, and path on every file node', () => {
        const graph = buildSkillGraph(recruitingBundle())
        const resume = graph.nodes.find((n) => n.id === IDS.resume)!
        expect(resume.kind).toBe('skill')
        expect(resume.label).toBe('resume-screener.md')
        expect(resume.path).toBe('resume-screener.md')

        const jd = graph.nodes.find((n) => n.id === IDS.jd)!
        expect(jd.kind).toBe('data')
        const score = graph.nodes.find((n) => n.id === IDS.score)!
        expect(score.kind).toBe('code')
    })

    it('only sets toolCount/fileCount on skill-kind nodes', () => {
        const graph = buildSkillGraph(recruitingBundle())
        const email = graph.nodes.find((n) => n.id === IDS.email)!
        // After propagation, email-drafter sees 3 tools and 4 files
        // (resume + interview + jd + score).
        expect(email.toolCount).toBe(3)
        expect(email.fileCount).toBe(4)

        const jd = graph.nodes.find((n) => n.id === IDS.jd)!
        expect(jd.toolCount).toBeUndefined()
        expect(jd.fileCount).toBeUndefined()
    })
})

// =============================================================================
// Tool nodes (synthesised + deduped)
// =============================================================================

describe('buildSkillGraph — synthesised tool nodes', () => {
    it('emits exactly one node per (provider, toolName) triple, deduped across the bundle', () => {
        const graph = buildSkillGraph(recruitingBundle())
        const toolNodes = graph.nodes.filter((n) => n.kind === 'tool')
        // Three distinct tools are referenced: candidate_lookup, python, send_email.
        expect(toolNodes.map((n) => n.id).sort()).toEqual(
            [toolNodeId('hr_platform', 'candidate_lookup'), toolNodeId('sandbox', 'python'), toolNodeId('comms', 'send_email')].sort()
        )
        for (const t of toolNodes) {
            expect(t.label).toBe(t.id.replace('tool::', ''))
        }
    })
})

// =============================================================================
// Edges — direct vs transitive
// =============================================================================

describe('buildSkillGraph — file edges', () => {
    it('marks direct file refs as file_direct and inherited refs as file_transitive', () => {
        const graph = buildSkillGraph(recruitingBundle())
        // email-drafter directly refs resume + interview, transitively refs jd + score.
        const fromEmail = graph.edges.filter((e) => e.source === IDS.email && e.relation.startsWith('file_'))
        const map = new Map(fromEmail.map((e) => [e.target, e.relation]))
        expect(map.get(IDS.resume)).toBe('file_direct')
        expect(map.get(IDS.interview)).toBe('file_direct')
        expect(map.get(IDS.jd)).toBe('file_transitive')
        expect(map.get(IDS.score)).toBe('file_transitive')
    })

    it('does not emit file edges for non-skill source entries (data/code)', () => {
        const graph = buildSkillGraph(recruitingBundle())
        for (const id of [IDS.jd, IDS.score]) {
            expect(graph.edges.filter((e) => e.source === id)).toEqual([])
        }
    })

    it('skips file edges whose target entry is missing from the bundle', () => {
        const bundle = recruitingBundle()
        // Inject a stale file ref pointing at a missing entry.
        bundle.entries[IDS.email].files.references.push({ source: 'app', nodeId: 'ghost-id' })
        const graph = buildSkillGraph(bundle)
        expect(graph.edges.find((e) => e.target === 'ghost-id')).toBeUndefined()
    })
})

describe('buildSkillGraph — tool edges', () => {
    it('marks self-declared tools as tool_direct', () => {
        const graph = buildSkillGraph(recruitingBundle())
        const candidate = toolNodeId('hr_platform', 'candidate_lookup')
        const fromResume = graph.edges.find((e) => e.source === IDS.resume && e.target === candidate)
        expect(fromResume?.relation).toBe('tool_direct')
    })

    it('marks transitively-inherited tools as tool_transitive', () => {
        const graph = buildSkillGraph(recruitingBundle())
        // email-drafter transitively inherits both candidate_lookup (from screener)
        // and python (from interviewer).
        const candidate = toolNodeId('hr_platform', 'candidate_lookup')
        const python = toolNodeId('sandbox', 'python')
        const sendEmail = toolNodeId('comms', 'send_email')
        const fromEmail = graph.edges
            .filter((e) => e.source === IDS.email && e.relation.startsWith('tool_'))
            .reduce<Record<string, string>>((acc, e) => ((acc[e.target] = e.relation), acc), {})
        expect(fromEmail[candidate]).toBe('tool_transitive')
        expect(fromEmail[python]).toBe('tool_transitive')
        expect(fromEmail[sendEmail]).toBe('tool_direct')
    })
})

// =============================================================================
// Broken reference accounting
// =============================================================================

describe('buildSkillGraph — broken references', () => {
    it('counts BROKEN_REF_MARKER occurrences in skill content', () => {
        const bundle = recruitingBundle()
        const target = bundle.entries[IDS.resume]
        target.content = `Stale link: ${BROKEN_REF_MARKER}\nAnother: ${BROKEN_REF_MARKER}`
        const graph = buildSkillGraph(bundle)
        expect(graph.nodes.find((n) => n.id === IDS.resume)!.brokenRefs).toBe(2)
    })

    it('omits the brokenRefs field when the count is zero', () => {
        const graph = buildSkillGraph(recruitingBundle())
        const node = graph.nodes.find((n) => n.id === IDS.resume)!
        expect(node.brokenRefs).toBeUndefined()
    })

    it('does not run the regex on non-skill entries', () => {
        const bundle = recruitingBundle()
        // Inject the marker into a data entry's content; builder must ignore it.
        const jd: SkillBundleEntry = bundle.entries[IDS.jd]
        jd.content = `${BROKEN_REF_MARKER} ${BROKEN_REF_MARKER}`
        const graph = buildSkillGraph(bundle)
        expect(graph.nodes.find((n) => n.id === IDS.jd)!.brokenRefs).toBeUndefined()
    })
})

// =============================================================================
// bundleId passthrough
// =============================================================================

describe('buildSkillGraph — DTO shape', () => {
    it('returns the same bundleId verbatim', () => {
        const bundle = recruitingBundle()
        expect(buildSkillGraph(bundle).bundleId).toBe(bundle.bundleId)
    })

    it('produces unique edge ids of the form `${source}->${target}:${relation}`', () => {
        const graph = buildSkillGraph(recruitingBundle())
        const ids = graph.edges.map((e) => e.id)
        expect(new Set(ids).size).toBe(ids.length)
        for (const e of graph.edges) {
            expect(e.id).toBe(`${e.source}->${e.target}:${e.relation}`)
        }
    })
})
