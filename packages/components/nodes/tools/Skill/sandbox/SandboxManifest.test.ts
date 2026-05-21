import { BuiltinHelper } from './builtinHelpers'
import { SkillBundle, SkillBundleEntry, SkillKind } from '../utils'
import {
    DEFAULT_HELPERS_DIR,
    DEFAULT_OUTPUT_DIR,
    DEFAULT_SKILLS_DIR,
    absolutePath,
    buildManifest,
    computeReachable,
    indexManifestByNodeId,
    indexManifestByPath,
    normalizeBundlePath,
    SandboxManifest,
    SandboxManifestEntry
} from './SandboxManifest'

// Tiny stub registry for helper-projection tests. Real helpers are
// exercised by builtinHelpers/contracts.test.ts; here we only care that
// `buildManifest` projects whatever registry it's handed into the
// manifest's `helpers` array.
const stubHelper = (name: string): BuiltinHelper => ({
    name,
    relPath: `${name}.py`,
    description: `stub ${name}`,
    handles: [{ extension: name }],
    bytes: async () => Buffer.from(`stub:${name}`, 'utf8'),
    digest: async () => `digest-${name}`,
    sizeBytes: async () => Buffer.byteLength(`stub:${name}`, 'utf8')
})

// =============================================================================
// Fixture helpers — mirror the recruiting + human-resources scenarios in
// docs/example-testing/. Both scenarios are flat: every file at the workspace
// root.
// =============================================================================

const entry = (
    overrides: Partial<SkillBundleEntry> & { nodeId: string; kind: SkillKind; path: string; name: string }
): SkillBundleEntry => ({
    nodeId: overrides.nodeId,
    kind: overrides.kind,
    name: overrides.name,
    path: overrides.path,
    content: overrides.content ?? '',
    tools: overrides.tools ?? { dependencies: [], references: [] },
    files: overrides.files ?? { references: [] },
    source: overrides.source
})

const recruitingBundle = (): SkillBundle => ({
    schemaVersion: 1,
    bundleId: 'b-recruit',
    workspaceId: 'ws-1',
    skillId: 'skill-recruit',
    builtAt: new Date().toISOString(),
    dependencyGraph: {
        'resume-screener': ['jd', 'score'],
        'interview-questions': ['resume-screener'],
        'email-drafter': ['resume-screener', 'interview-questions'],
        jd: [],
        score: []
    },
    reverseGraph: {},
    entries: {
        'resume-screener': entry({
            nodeId: 'resume-screener',
            kind: 'skill',
            name: 'resume-screener.md',
            path: 'resume-screener.md',
            content: '# Resume Screener',
            source: { nodeId: 'resume-screener', contentDigest: 'd-resume' },
            files: {
                references: [
                    { source: 'app', nodeId: 'jd' },
                    { source: 'app', nodeId: 'score' }
                ]
            }
        }),
        'interview-questions': entry({
            nodeId: 'interview-questions',
            kind: 'skill',
            name: 'interview-questions.md',
            path: 'interview-questions.md',
            content: '# Interview',
            source: { nodeId: 'interview-questions', contentDigest: 'd-interview' },
            files: { references: [{ source: 'app', nodeId: 'resume-screener' }] }
        }),
        'email-drafter': entry({
            nodeId: 'email-drafter',
            kind: 'skill',
            name: 'email-drafter.md',
            path: 'email-drafter.md',
            content: '# Email',
            source: { nodeId: 'email-drafter', contentDigest: 'd-email' },
            files: {
                references: [
                    { source: 'app', nodeId: 'resume-screener' },
                    { source: 'app', nodeId: 'interview-questions' }
                ]
            }
        }),
        jd: entry({
            nodeId: 'jd',
            kind: 'data',
            name: 'job-description.txt',
            path: 'job-description.txt',
            source: { nodeId: 'jd', contentDigest: 'd-jd' }
        }),
        score: entry({
            nodeId: 'score',
            kind: 'code',
            name: 'scoring_algorithm.js',
            path: 'scoring_algorithm.js',
            source: { nodeId: 'score', contentDigest: 'd-score' }
        })
    }
})

// =============================================================================
// normalizeBundlePath
// =============================================================================

describe('normalizeBundlePath', () => {
    const cases: Array<[string | undefined, string]> = [
        [undefined, ''],
        ['', ''],
        ['./resume-screener.md', 'resume-screener.md'],
        ['/resume-screener.md', 'resume-screener.md'],
        ['skills/resume-screener.md', 'resume-screener.md'],
        ['skills/sub/foo.md', 'sub/foo.md'],
        ['./skills/foo.md', 'foo.md'],
        ['  ./resume-screener.md  ', 'resume-screener.md'],
        ['sub\\foo.md', 'sub/foo.md'],
        ['sub//foo.md', 'sub/foo.md']
    ]
    it.each(cases)('normalizes %p → %p', (input, expected) => {
        expect(normalizeBundlePath(input)).toBe(expected)
    })
})

// =============================================================================
// computeReachable — BFS over dependency graph + file references
// =============================================================================

describe('computeReachable', () => {
    it('reaches every transitive skill node from a single root', () => {
        const reachable = computeReachable(['email-drafter'], recruitingBundle())
        expect([...reachable].sort()).toEqual(['email-drafter', 'interview-questions', 'jd', 'resume-screener', 'score'].sort())
    })

    it('limits the walk to the supplied roots', () => {
        const reachable = computeReachable(['interview-questions'], recruitingBundle())
        expect([...reachable].sort()).toEqual(['interview-questions', 'jd', 'resume-screener', 'score'].sort())
    })

    it('returns an empty set when called with no roots', () => {
        expect(computeReachable([], recruitingBundle()).size).toBe(0)
    })

    it('walks explicit `entry.files.references` even when dependencyGraph misses them', () => {
        // Construct a bundle whose `dependencyGraph` is empty but the entry
        // still carries explicit file references — computeReachable must
        // pick them up via the fallback walk.
        const bundle: SkillBundle = recruitingBundle()
        bundle.dependencyGraph = { 'email-drafter': [] }
        const reachable = computeReachable(['email-drafter'], bundle)
        // resume-screener and interview-questions are in `files.references`,
        // and through them we discover jd and score.
        expect(reachable.has('resume-screener')).toBe(true)
        expect(reachable.has('interview-questions')).toBe(true)
        expect(reachable.has('jd')).toBe(true)
        expect(reachable.has('score')).toBe(true)
    })

    it('terminates on cycles', () => {
        const bundle: SkillBundle = recruitingBundle()
        bundle.dependencyGraph = { a: ['b'], b: ['a'] }
        bundle.entries = {
            a: entry({ nodeId: 'a', kind: 'skill', name: 'a.md', path: 'a.md' }),
            b: entry({ nodeId: 'b', kind: 'skill', name: 'b.md', path: 'b.md' })
        }
        expect([...computeReachable(['a'], bundle)].sort()).toEqual(['a', 'b'])
    })
})

// =============================================================================
// buildManifest — projection from bundle + selected ids
// =============================================================================

describe('buildManifest — recruiting scenario', () => {
    it('returns an empty entries manifest for empty selectedIds and skips VM startup paths', () => {
        const manifest = buildManifest(recruitingBundle(), [], { includeHelpers: false })
        expect(manifest.skillsDir).toBe(DEFAULT_SKILLS_DIR)
        expect(manifest.outputDir).toBe(DEFAULT_OUTPUT_DIR)
        expect(manifest.helpersDir).toBe(DEFAULT_HELPERS_DIR)
        expect(manifest.entries).toEqual([])
        expect(manifest.helpers).toEqual([])
    })

    it('projects every reachable file (skill + data + code) to a manifest entry', () => {
        const manifest = buildManifest(recruitingBundle(), ['email-drafter'])
        const relPaths = manifest.entries.map((e) => e.relPath)
        expect(relPaths.sort()).toEqual(
            ['email-drafter.md', 'interview-questions.md', 'job-description.txt', 'resume-screener.md', 'scoring_algorithm.js'].sort()
        )
    })

    it('emits entries in alphabetical relPath order so logs and tree hints stay deterministic', () => {
        const manifest = buildManifest(recruitingBundle(), ['email-drafter'])
        const sorted = manifest.entries.map((e) => e.relPath).slice()
        expect(sorted).toEqual([...sorted].sort((a, b) => a.localeCompare(b)))
    })

    it('extracts the lowercased extension from the relPath', () => {
        const manifest = buildManifest(recruitingBundle(), ['email-drafter'])
        const byPath = new Map(manifest.entries.map((e) => [e.relPath, e]))
        expect(byPath.get('resume-screener.md')!.extension).toBe('md')
        expect(byPath.get('job-description.txt')!.extension).toBe('txt')
        expect(byPath.get('scoring_algorithm.js')!.extension).toBe('js')
    })

    it('carries the contentDigest forward as the cache key', () => {
        const manifest = buildManifest(recruitingBundle(), ['email-drafter'])
        const jd = manifest.entries.find((e) => e.relPath === 'job-description.txt')!
        expect(jd.digest).toBe('d-jd')
    })

    it('honours the kinds filter (skill-only)', () => {
        const manifest = buildManifest(recruitingBundle(), ['email-drafter'], { kinds: ['skill'] })
        const kinds = new Set(manifest.entries.map((e) => e.kind))
        expect(kinds.size).toBe(1)
        expect(kinds.has('skill')).toBe(true)
    })

    it('honours custom skillsDir, outputDir, and helpersDir overrides', () => {
        const manifest = buildManifest(recruitingBundle(), ['email-drafter'], {
            skillsDir: '/sandbox/inputs',
            outputDir: '/sandbox/outputs',
            helpersDir: '/sandbox/helpers',
            includeHelpers: false
        })
        expect(manifest.skillsDir).toBe('/sandbox/inputs')
        expect(manifest.outputDir).toBe('/sandbox/outputs')
        expect(manifest.helpersDir).toBe('/sandbox/helpers')
    })

    it('drops entries whose path is missing or empty (defensive)', () => {
        const bundle = recruitingBundle()
        bundle.entries['orphan'] = entry({ nodeId: 'orphan', kind: 'data', name: 'x', path: '' })
        bundle.dependencyGraph['email-drafter'].push('orphan')
        const manifest = buildManifest(bundle, ['email-drafter'])
        expect(manifest.entries.find((e) => e.nodeId === 'orphan')).toBeUndefined()
    })

    it('de-duplicates colliding relPaths (last-write-wins)', () => {
        const bundle = recruitingBundle()
        // Two distinct nodes claiming the same path — only one entry survives.
        bundle.entries['dup'] = entry({ nodeId: 'dup', kind: 'data', name: 'job-description.txt', path: 'job-description.txt' })
        bundle.dependencyGraph['email-drafter'].push('dup')
        const manifest = buildManifest(bundle, ['email-drafter'])
        const matches = manifest.entries.filter((e) => e.relPath === 'job-description.txt')
        expect(matches).toHaveLength(1)
    })
})

// =============================================================================
// buildManifest — built-in helper projection
// =============================================================================

describe('buildManifest — built-in helpers', () => {
    it('projects every entry from the supplied helper registry into manifest.helpers', () => {
        const helpers = [stubHelper('pdf_extract'), stubHelper('docx_extract')]
        const manifest = buildManifest(recruitingBundle(), ['email-drafter'], {
            includeHelpers: true,
            helperRegistry: helpers
        })
        expect(manifest.helpers).toHaveLength(2)
        expect(manifest.helpers.map((h) => h.name)).toEqual(['pdf_extract', 'docx_extract'])
        expect(manifest.helpers.map((h) => h.relPath)).toEqual(['pdf_extract.py', 'docx_extract.py'])
    })

    it('returns an empty helpers array when includeHelpers is false', () => {
        const manifest = buildManifest(recruitingBundle(), ['email-drafter'], {
            includeHelpers: false,
            helperRegistry: [stubHelper('pdf_extract')]
        })
        expect(manifest.helpers).toEqual([])
    })

    it('still projects helpers when selectedIds is empty (helpers are session-scoped, not bundle-scoped)', () => {
        const manifest = buildManifest(recruitingBundle(), [], {
            includeHelpers: true,
            helperRegistry: [stubHelper('pdf_extract')]
        })
        expect(manifest.entries).toEqual([])
        expect(manifest.helpers).toHaveLength(1)
        expect(manifest.helpers[0].name).toBe('pdf_extract')
    })

    it('initialises helper digest/sizeBytes as empty placeholders for the session to fill in', () => {
        const manifest = buildManifest(recruitingBundle(), ['email-drafter'], {
            includeHelpers: true,
            helperRegistry: [stubHelper('pdf_extract')]
        })
        // Resolved during materialisation by SandboxSession; manifest only
        // carries placeholders so a stale value can never sneak through.
        expect(manifest.helpers[0].digest).toBe('')
        expect(manifest.helpers[0].sizeBytes).toBe(0)
    })
})

// =============================================================================
// indexManifestByPath / byNodeId / absolutePath
// =============================================================================

describe('indexManifestByPath', () => {
    it('returns a Map keyed by relPath', () => {
        const manifest = buildManifest(recruitingBundle(), ['email-drafter'])
        const idx = indexManifestByPath(manifest)
        expect(idx.size).toBe(manifest.entries.length)
        expect(idx.get('job-description.txt')!.kind).toBe('data')
    })
})

describe('indexManifestByNodeId', () => {
    it('returns a Map keyed by nodeId', () => {
        const manifest = buildManifest(recruitingBundle(), ['email-drafter'])
        const idx = indexManifestByNodeId(manifest)
        expect(idx.get('jd')!.relPath).toBe('job-description.txt')
        expect(idx.get('score')!.kind).toBe('code')
    })
})

describe('absolutePath', () => {
    const manifest: SandboxManifest = buildManifest(recruitingBundle(), ['email-drafter'])
    const idx = indexManifestByNodeId(manifest)

    it('joins the skillsDir and the entry relPath using POSIX separators', () => {
        const jd = idx.get('jd') as SandboxManifestEntry
        expect(absolutePath(manifest, jd)).toBe('/home/user/skills/job-description.txt')
    })

    it('respects custom skillsDir overrides', () => {
        const custom = buildManifest(recruitingBundle(), ['email-drafter'], { skillsDir: '/tmp/work' })
        const idx2 = indexManifestByNodeId(custom)
        expect(absolutePath(custom, idx2.get('score')!)).toBe('/tmp/work/scoring_algorithm.js')
    })

    it('handles trailing/leading slash quirks idempotently', () => {
        const m1 = buildManifest(recruitingBundle(), ['email-drafter'], { skillsDir: '/home/user/skills/' })
        const m2 = buildManifest(recruitingBundle(), ['email-drafter'], { skillsDir: '/home/user/skills' })
        const a = absolutePath(m1, indexManifestByNodeId(m1).get('jd')!)
        const b = absolutePath(m2, indexManifestByNodeId(m2).get('jd')!)
        expect(a).toBe(b)
    })
})
