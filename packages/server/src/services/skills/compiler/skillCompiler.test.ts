import { CompileInput, SkillBundle, SkillDocument, SkillFileTree, SkillKind, SkillMetadata, SkillTreeNode } from '../entities'
import { sha256 } from '../utils/digest'
import { BROKEN_REF_MARKER, SCHEMA_VERSION, SkillCompiler } from './skillCompiler'

// =============================================================================
// Test fixtures — mirror the canonical scenarios in docs/example-testing/.
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
    metadata: SkillMetadata = { tools: {} }
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

// -----------------------------------------------------------------------------
// Recruiting scenario — the same A→B→C three-tier graph used by
// docs/example-testing/recruiting/. Three markdown skills, one .txt data file
// and one .js code file all at the workspace root.
// -----------------------------------------------------------------------------

const RECRUITING_IDS = {
    resume: 'resume-screener',
    interview: 'interview-questions',
    email: 'email-drafter',
    jd: 'jd-node',
    score: 'score-node',
    candidateUuid: 'uuid-candidate-lookup',
    pythonUuid: 'uuid-python-runner',
    sendEmailUuid: 'uuid-send-email'
} as const

const recruitingFileTree = (): SkillFileTree => ({
    nodes: [
        file(RECRUITING_IDS.resume, 'resume-screener.md'),
        file(RECRUITING_IDS.interview, 'interview-questions.md'),
        file(RECRUITING_IDS.email, 'email-drafter.md'),
        file(RECRUITING_IDS.jd, 'job-description.txt'),
        file(RECRUITING_IDS.score, 'scoring_algorithm.js')
    ]
})

const recruitingInput = (): CompileInput => ({
    skillId: 'skill-recruiting',
    workspaceId: 'ws-1',
    fileTree: recruitingFileTree(),
    nodeDocuments: [
        doc(
            RECRUITING_IDS.resume,
            'skill',
            'resume-screener.md',
            [
                '# Resume Screening Skill',
                '',
                'JD: {{skill.' + RECRUITING_IDS.jd + '}}',
                'Scorer: {{skill.' + RECRUITING_IDS.score + '}}',
                'Lookup: {{tool.hr_platform.candidate_lookup.' + RECRUITING_IDS.candidateUuid + '}}',
                'Resume input: {{question}}'
            ].join('\n'),
            {
                tools: {
                    [RECRUITING_IDS.candidateUuid]: {
                        type: 'custom',
                        provider: 'hr_platform',
                        toolName: 'candidate_lookup',
                        uuid: RECRUITING_IDS.candidateUuid,
                        enabled: true
                    }
                }
            }
        ),
        doc(
            RECRUITING_IDS.interview,
            'skill',
            'interview-questions.md',
            [
                '# Interview Question Generator',
                '',
                'Screening: {{skill.' + RECRUITING_IDS.resume + '}}',
                'Code tool: {{tool.sandbox.python.' + RECRUITING_IDS.pythonUuid + '}}'
            ].join('\n')
        ),
        doc(
            RECRUITING_IDS.email,
            'skill',
            'email-drafter.md',
            [
                '# Email Drafter',
                '',
                'Screening report: {{skill.' + RECRUITING_IDS.resume + '}}',
                'Interview plan: {{skill.' + RECRUITING_IDS.interview + '}}',
                'Sender: {{tool.comms.send_email.' + RECRUITING_IDS.sendEmailUuid + '}}'
            ].join('\n'),
            {
                tools: {
                    [RECRUITING_IDS.sendEmailUuid]: {
                        type: 'custom',
                        provider: 'comms',
                        toolName: 'send_email',
                        uuid: RECRUITING_IDS.sendEmailUuid,
                        credentialId: 'cred-smtp',
                        enabled: true
                    }
                }
            }
        ),
        doc(RECRUITING_IDS.jd, 'data', 'job-description.txt', 'Senior Python Developer — JD body…'),
        doc(RECRUITING_IDS.score, 'code', 'scoring_algorithm.js', 'console.log("scorer")')
    ]
})

const compile = (input: CompileInput = recruitingInput()): SkillBundle => new SkillCompiler().compileAll(input)

// =============================================================================
// compileAll — recruiting happy path
// =============================================================================

describe('SkillCompiler.compileAll — recruiting scenario', () => {
    it('emits a bundle with one entry per file node and correct schema metadata', () => {
        const bundle = compile()
        expect(bundle.schemaVersion).toBe(SCHEMA_VERSION)
        expect(bundle.skillId).toBe('skill-recruiting')
        expect(bundle.workspaceId).toBe('ws-1')
        expect(Object.keys(bundle.entries).sort()).toEqual(
            [RECRUITING_IDS.resume, RECRUITING_IDS.interview, RECRUITING_IDS.email, RECRUITING_IDS.jd, RECRUITING_IDS.score].sort()
        )
        // bundleId is content-addressed and stable.
        expect(bundle.bundleId).toMatch(/^[0-9a-f]{64}$/)
        expect(compile().bundleId).toBe(bundle.bundleId)
    })

    it('resolves `{{skill.<id>}}` placeholders to relative paths in the resolved markdown', () => {
        const bundle = compile()
        const resume = bundle.entries[RECRUITING_IDS.resume].content
        expect(resume).toContain('JD: ./job-description.txt')
        expect(resume).toContain('Scorer: ./scoring_algorithm.js')

        const email = bundle.entries[RECRUITING_IDS.email].content
        expect(email).toContain('Screening report: ./resume-screener.md')
        expect(email).toContain('Interview plan: ./interview-questions.md')
    })

    it('replaces `{{tool.<provider>.<toolName>.<uuid>}}` with a labelled bracket', () => {
        const resume = compile().entries[RECRUITING_IDS.resume].content
        expect(resume).toContain(`[Candidate Lookup: hr_platform.candidate_lookup.${RECRUITING_IDS.candidateUuid}]`)
    })

    it('leaves runtime placeholders verbatim for the call-time resolver', () => {
        const resume = compile().entries[RECRUITING_IDS.resume].content
        expect(resume).toContain('Resume input: {{question}}')
    })

    it('builds direct + reverse dependency graphs that match the docs/example-testing diagram', () => {
        const bundle = compile()
        // resume-screener.md ─┬─▶ job-description.txt
        //                     └─▶ scoring_algorithm.js
        expect(bundle.dependencyGraph[RECRUITING_IDS.resume].sort()).toEqual([RECRUITING_IDS.jd, RECRUITING_IDS.score].sort())
        // interview-questions.md ─▶ resume-screener.md
        expect(bundle.dependencyGraph[RECRUITING_IDS.interview]).toEqual([RECRUITING_IDS.resume])
        // email-drafter.md ─┬─▶ resume-screener.md
        //                   └─▶ interview-questions.md
        expect(bundle.dependencyGraph[RECRUITING_IDS.email].sort()).toEqual([RECRUITING_IDS.interview, RECRUITING_IDS.resume])
        // Non-skill (data/code) nodes never have outgoing edges of their own.
        expect(bundle.dependencyGraph[RECRUITING_IDS.jd]).toEqual([])
        expect(bundle.dependencyGraph[RECRUITING_IDS.score]).toEqual([])
        // Reverse graph is the transpose.
        expect(bundle.reverseGraph[RECRUITING_IDS.resume].sort()).toEqual([RECRUITING_IDS.email, RECRUITING_IDS.interview])
        expect(bundle.reverseGraph[RECRUITING_IDS.interview]).toEqual([RECRUITING_IDS.email])
        expect(bundle.reverseGraph[RECRUITING_IDS.jd]).toEqual([RECRUITING_IDS.resume])
        expect(bundle.reverseGraph[RECRUITING_IDS.score]).toEqual([RECRUITING_IDS.resume])
    })

    it('snapshots directTools / directFiles before propagation mutates them', () => {
        const bundle = compile()
        const email = bundle.entries[RECRUITING_IDS.email]
        // email-drafter only declares send_email itself.
        expect(email.directTools!.map((d) => d.toolName)).toEqual(['send_email'])
        // …but it directly references both screener and interviewer.
        expect(email.directFiles!.map((f) => f.nodeId).sort()).toEqual([RECRUITING_IDS.interview, RECRUITING_IDS.resume])
    })

    it('propagates transitive tool deps from screener + interviewer up to email-drafter', () => {
        const bundle = compile()
        const email = bundle.entries[RECRUITING_IDS.email]
        const triples = email.tools.dependencies.map((d) => `${d.provider}.${d.toolName}`).sort()
        expect(triples).toEqual(['comms.send_email', 'hr_platform.candidate_lookup', 'sandbox.python'])

        // References should expose the original UUIDs so the runtime can wire credentials.
        expect(email.tools.references.map((r) => r.uuid).sort()).toEqual(
            [RECRUITING_IDS.candidateUuid, RECRUITING_IDS.pythonUuid, RECRUITING_IDS.sendEmailUuid].sort()
        )
    })

    it('propagates transitive file refs (screener.jd, screener.score) up through the graph', () => {
        const bundle = compile()
        const interview = bundle.entries[RECRUITING_IDS.interview]
        const interviewFileIds = interview.files.references.map((f) => f.nodeId).sort()
        expect(interviewFileIds).toEqual([RECRUITING_IDS.jd, RECRUITING_IDS.resume, RECRUITING_IDS.score].sort())

        const email = bundle.entries[RECRUITING_IDS.email]
        const emailFileIds = email.files.references.map((f) => f.nodeId).sort()
        expect(emailFileIds).toEqual([RECRUITING_IDS.jd, RECRUITING_IDS.resume, RECRUITING_IDS.score, RECRUITING_IDS.interview].sort())
    })

    it('keeps non-skill entries empty (they have no compiled markdown of their own)', () => {
        const bundle = compile()
        for (const id of [RECRUITING_IDS.jd, RECRUITING_IDS.score]) {
            const entry = bundle.entries[id]
            expect(entry.kind === 'data' || entry.kind === 'code').toBe(true)
            expect(entry.content).toBe('')
            expect(entry.tools.dependencies).toEqual([])
            expect(entry.files.references).toEqual([])
        }
    })
})

// =============================================================================
// compileAll — placeholder edge cases (mirrors §4 of test-prompts.md)
// =============================================================================

describe('SkillCompiler.compileAll — placeholder edge cases', () => {
    it('renders [SKILL_BROKEN_REFERENCE] when {{skill.<id>}} points at an unknown node', () => {
        const tree: SkillFileTree = { nodes: [file('a', 'a.md')] }
        const input: CompileInput = {
            skillId: 's',
            workspaceId: 'w',
            fileTree: tree,
            nodeDocuments: [doc('a', 'skill', 'a.md', 'Pointer: {{skill.does-not-exist}}')]
        }
        const bundle = new SkillCompiler().compileAll(input)
        expect(bundle.entries.a.content).toContain(BROKEN_REF_MARKER)
        // Broken refs do NOT contribute to file references.
        expect(bundle.entries.a.files.references).toEqual([])
    })

    it('preserves placeholders inside inline code spans (escape via backticks)', () => {
        const tree: SkillFileTree = { nodes: [file('a', 'a.md')] }
        const md = 'Example of how placeholders look: `{{tool.foo.bar.baz}}`.'
        const input: CompileInput = {
            skillId: 's',
            workspaceId: 'w',
            fileTree: tree,
            nodeDocuments: [doc('a', 'skill', 'a.md', md)]
        }
        const bundle = new SkillCompiler().compileAll(input)
        // Verbatim — no label substitution because it's inside backticks.
        expect(bundle.entries.a.content).toBe(md)
        expect(bundle.entries.a.tools.dependencies).toEqual([])
    })

    it('does not classify tool placeholders inside fenced code blocks', () => {
        const tree: SkillFileTree = { nodes: [file('a', 'a.md')] }
        const md = ['```js', "console.log('{{tool.foo.bar.baz}}')", '```'].join('\n')
        const input: CompileInput = {
            skillId: 's',
            workspaceId: 'w',
            fileTree: tree,
            nodeDocuments: [doc('a', 'skill', 'a.md', md)]
        }
        const bundle = new SkillCompiler().compileAll(input)
        expect(bundle.entries.a.content).toBe(md)
        expect(bundle.entries.a.tools.dependencies).toEqual([])
    })
})

// =============================================================================
// compileAll — bundleId is content-addressed
// =============================================================================

describe('SkillCompiler.compileAll — content-addressed bundleId', () => {
    it('mints the same bundleId when the input is unchanged', () => {
        const a = compile().bundleId
        const b = compile().bundleId
        expect(a).toBe(b)
    })

    it('mints a different bundleId when any node digest changes', () => {
        const original = compile()
        const tweaked = recruitingInput()
        const resumeDoc = tweaked.nodeDocuments.find((d) => d.nodeId === RECRUITING_IDS.resume)!
        resumeDoc.content = resumeDoc.content + '\n<edit>\n'
        resumeDoc.contentDigest = sha256(resumeDoc.content)
        const next = new SkillCompiler().compileAll(tweaked)
        expect(next.bundleId).not.toBe(original.bundleId)
    })
})

// =============================================================================
// compileOne — anonymous prompt resolution
// =============================================================================

describe('SkillCompiler.compileOne', () => {
    it('resolves `{{skill.<id>}}` to absolute skills/<path> when the caller is anonymous', () => {
        const bundle = compile()
        const compiler = new SkillCompiler()
        const prompt = doc('__anon__', 'skill', '__prompt__', 'Use {{skill.' + RECRUITING_IDS.resume + '}} now.')
        const out = compiler.compileOne(prompt, bundle)
        expect(out.content).toBe('Use skills/resume-screener.md now.')
    })

    it('inherits the transitive tool deps of every referenced skill', () => {
        const bundle = compile()
        const compiler = new SkillCompiler()
        const prompt = doc('__anon__', 'skill', '__prompt__', '{{skill.' + RECRUITING_IDS.email + '}}')
        const out = compiler.compileOne(prompt, bundle)
        const triples = out.tools.dependencies.map((d) => `${d.provider}.${d.toolName}`).sort()
        // email-drafter has all three after propagation; the anonymous prompt picks them up.
        expect(triples).toEqual(['comms.send_email', 'hr_platform.candidate_lookup', 'sandbox.python'])
    })

    it('leaves runtime placeholders untouched', () => {
        const bundle = compile()
        const compiler = new SkillCompiler()
        const prompt = doc('__anon__', 'skill', '__prompt__', 'Q: {{question}} R: {{$vars.x}}')
        const out = compiler.compileOne(prompt, bundle)
        expect(out.content).toBe('Q: {{question}} R: {{$vars.x}}')
    })
})
