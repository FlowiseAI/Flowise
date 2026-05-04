import {
    FamilyDef,
    formatRecipeCommand,
    formatTaskCommand,
    groupByRecipeFamily,
    recipeForEntry,
    RECIPE_ORDER,
    RecipeFamily,
    renderHelperCatalog,
    renderReferenceRecipes
} from './commandRecipes'
import { buildBashToolDescription } from './SandboxBashTool'
import { SandboxHelperEntry, SandboxManifest, SandboxManifestEntry } from './SandboxManifest'
import { SkillBundleEntry } from '../utils'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeEntry = (
    overrides: Partial<SandboxManifestEntry> & Pick<SandboxManifestEntry, 'relPath' | 'extension' | 'kind'>
): SandboxManifestEntry => ({
    nodeId: overrides.nodeId ?? `node-${overrides.relPath}`,
    relPath: overrides.relPath,
    kind: overrides.kind,
    extension: overrides.extension,
    name: overrides.name ?? overrides.relPath.split('/').pop() ?? overrides.relPath,
    digest: overrides.digest
})

const makeHelper = (name: string, sizeBytes = 100): SandboxHelperEntry => ({
    name,
    relPath: `${name}.py`,
    digest: `digest-${name}`,
    sizeBytes
})

const makeManifest = (entries: SandboxManifestEntry[], helpers: SandboxHelperEntry[] = []): SandboxManifest => ({
    skillsDir: '/home/user/skills',
    outputDir: '/home/user/output',
    helpersDir: '/home/user/helpers',
    entries,
    helpers
})

// ---------------------------------------------------------------------------
// recipeForEntry
// ---------------------------------------------------------------------------

describe('recipeForEntry', () => {
    const cases: Array<{ ext: string; kind: SandboxManifestEntry['kind']; expected: RecipeFamily }> = [
        { ext: 'js', kind: 'code', expected: 'exec-node' },
        { ext: 'mjs', kind: 'code', expected: 'exec-node' },
        { ext: 'cjs', kind: 'code', expected: 'exec-node' },
        { ext: 'py', kind: 'code', expected: 'exec-python' },
        { ext: 'sh', kind: 'code', expected: 'exec-shell' },
        { ext: 'bash', kind: 'code', expected: 'exec-shell' },
        { ext: 'rb', kind: 'code', expected: 'exec-ruby' },
        { ext: 'md', kind: 'skill', expected: 'data-md' },
        { ext: 'markdown', kind: 'skill', expected: 'data-md' },
        { ext: 'txt', kind: 'data', expected: 'data-text' },
        { ext: 'log', kind: 'data', expected: 'data-log' },
        { ext: 'json', kind: 'data', expected: 'data-json' },
        { ext: 'csv', kind: 'data', expected: 'data-csv' },
        { ext: 'tsv', kind: 'data', expected: 'data-tsv' },
        { ext: 'yaml', kind: 'data', expected: 'data-yaml' },
        { ext: 'yml', kind: 'data', expected: 'data-yaml' },
        { ext: 'xml', kind: 'data', expected: 'data-xml' },
        { ext: 'html', kind: 'data', expected: 'data-html' },
        { ext: 'htm', kind: 'data', expected: 'data-html' },
        { ext: 'pdf', kind: 'binary', expected: 'binary-pdf' },
        { ext: 'zip', kind: 'binary', expected: 'binary-archive' },
        { ext: 'jar', kind: 'binary', expected: 'binary-archive' },
        { ext: 'whl', kind: 'binary', expected: 'binary-archive' },
        // M3 split: each Office Open XML format gets its own family so
        // helper-promoted variants can route per-extension.
        { ext: 'docx', kind: 'binary', expected: 'binary-docx' },
        { ext: 'xlsx', kind: 'binary', expected: 'binary-xlsx' },
        { ext: 'pptx', kind: 'binary', expected: 'binary-pptx' },
        { ext: 'png', kind: 'binary', expected: 'binary-image' },
        { ext: 'jpg', kind: 'binary', expected: 'binary-image' },
        { ext: 'svg', kind: 'binary', expected: 'binary-image' }
    ]

    for (const { ext, kind, expected } of cases) {
        it(`maps .${ext} (${kind}) -> ${expected}`, () => {
            const def = recipeForEntry(makeEntry({ relPath: `foo.${ext}`, extension: ext, kind }))
            expect(def.family).toBe(expected)
        })
    }

    it('falls back to exec-node for unknown code extensions', () => {
        const def = recipeForEntry(makeEntry({ relPath: 'foo.zzz', extension: 'zzz', kind: 'code' }))
        expect(def.family).toBe('exec-node')
    })

    it('falls back to data-md for unknown skill extensions', () => {
        const def = recipeForEntry(makeEntry({ relPath: 'foo.zzz', extension: 'zzz', kind: 'skill' }))
        expect(def.family).toBe('data-md')
    })

    it('falls back to data-text for unknown data extensions', () => {
        const def = recipeForEntry(makeEntry({ relPath: 'foo.zzz', extension: 'zzz', kind: 'data' }))
        expect(def.family).toBe('data-text')
    })

    it('falls back to binary-other for unknown binary extensions', () => {
        const def = recipeForEntry(makeEntry({ relPath: 'foo.zzz', extension: 'zzz', kind: 'binary' }))
        expect(def.family).toBe('binary-other')
    })
})

// ---------------------------------------------------------------------------
// Family invariants
// ---------------------------------------------------------------------------

describe('FamilyDef invariants', () => {
    it('exec families have no alternatives', () => {
        const execFams: RecipeFamily[] = ['exec-node', 'exec-python', 'exec-shell', 'exec-ruby']
        for (const fam of execFams) {
            const def = recipeForEntry(makeEntry({ relPath: 'foo', extension: pickExtFor(fam), kind: 'code' }))
            expect(def.family).toBe(fam)
            expect(def.primary.id).toBe('exec')
            expect(def.alternatives).toHaveLength(0)
        }
    })

    it('every data/binary family carries at least one alternative', () => {
        const dataFams: RecipeFamily[] = [
            'data-md',
            'data-text',
            'data-log',
            'data-json',
            'data-csv',
            'data-tsv',
            'data-yaml',
            'data-xml',
            'data-html',
            'binary-pdf',
            'binary-docx',
            'binary-xlsx',
            'binary-pptx',
            'binary-archive',
            'binary-image',
            'binary-other'
        ]
        for (const fam of dataFams) {
            const def = recipeForEntry(makeEntry({ relPath: 'foo', extension: pickExtFor(fam), kind: pickKindFor(fam) }))
            expect(def.family).toBe(fam)
            expect(def.alternatives.length).toBeGreaterThan(0)
        }
    })
})

// ---------------------------------------------------------------------------
// formatTaskCommand
// ---------------------------------------------------------------------------

describe('formatTaskCommand', () => {
    it('substitutes {path} for non-exec tasks and drops {args}', () => {
        const def = recipeForEntry(makeEntry({ relPath: 'a.txt', extension: 'txt', kind: 'data' }))
        expect(formatTaskCommand(def.primary, '/home/user/skills/a.txt')).toBe('head -n 50 /home/user/skills/a.txt')
    })

    it('appends [args...] to exec tasks when no argsHint provided', () => {
        const def = recipeForEntry(makeEntry({ relPath: 'a.js', extension: 'js', kind: 'code' }))
        expect(formatTaskCommand(def.primary, '/home/user/skills/a.js')).toBe('node /home/user/skills/a.js [args...]')
    })

    it('substitutes the argsHint when provided', () => {
        const def = recipeForEntry(makeEntry({ relPath: 'a.js', extension: 'js', kind: 'code' }))
        expect(formatTaskCommand(def.primary, '/home/user/skills/a.js', '"resume" "jd"')).toBe('node /home/user/skills/a.js "resume" "jd"')
    })

    it('keeps verbatim placeholders the LLM substitutes itself', () => {
        const def = recipeForEntry(makeEntry({ relPath: 'a.json', extension: 'json', kind: 'data' }))
        const queryTask = def.alternatives.find((t) => t.id === 'query')!
        const cmd = formatTaskCommand(queryTask, '/home/user/skills/a.json')
        expect(cmd).toBe("jq '<query>' /home/user/skills/a.json")
    })
})

describe('formatRecipeCommand (legacy shim)', () => {
    it('renders a primary task by template', () => {
        const def = recipeForEntry(makeEntry({ relPath: 'a.json', extension: 'json', kind: 'data' }))
        // JSON primary is a byte peek so the LLM never starts with `cat`.
        expect(formatRecipeCommand(def.primary, '/home/user/skills/a.json')).toBe('head -c 2048 /home/user/skills/a.json')
    })

    it('handles legacy CommandRecipe shape with {args}', () => {
        const recipe = { family: 'exec-node' as RecipeFamily, label: 'L', template: 'node {path}{args}', description: 'D' }
        expect(formatRecipeCommand(recipe, '/x.js')).toBe('node /x.js [args...]')
    })
})

// ---------------------------------------------------------------------------
// groupByRecipeFamily
// ---------------------------------------------------------------------------

describe('groupByRecipeFamily', () => {
    it('orders groups by RECIPE_ORDER and bundles entries per family', () => {
        const entries = [
            makeEntry({ relPath: 'b.json', extension: 'json', kind: 'data' }),
            makeEntry({ relPath: 'a.js', extension: 'js', kind: 'code' }),
            makeEntry({ relPath: 'c.json', extension: 'json', kind: 'data' }),
            makeEntry({ relPath: 'd.py', extension: 'py', kind: 'code' })
        ]
        const groups = groupByRecipeFamily(entries)
        const families = groups.map((g) => g.family)
        const expectedOrder = RECIPE_ORDER.filter((f) => f === 'exec-node' || f === 'exec-python' || f === 'data-json')
        expect(families).toEqual(expectedOrder)
        const json = groups.find((g) => g.family === 'data-json')!
        expect(json.entries.map((e) => e.relPath)).toEqual(['b.json', 'c.json'])
    })
})

// ---------------------------------------------------------------------------
// renderReferenceRecipes
// ---------------------------------------------------------------------------

describe('renderReferenceRecipes', () => {
    const buildContext = (entries: SandboxManifestEntry[]) => {
        const manifest = makeManifest(entries)
        const idx = new Map<string, SandboxManifestEntry>(entries.map((e) => [e.nodeId, e]))
        return { manifest, idx }
    }

    const skillEntry = (refIds: string[]): SkillBundleEntry =>
        ({
            nodeId: 'skill-1',
            kind: 'skill',
            name: 'Test',
            path: 'test.md',
            content: '',
            tools: { dependencies: [], references: [] },
            files: { references: refIds.map((nodeId) => ({ source: 'app', nodeId })) }
        } as unknown as SkillBundleEntry)

    it('emits a single line for exec references', () => {
        const js = makeEntry({ relPath: 'a.js', extension: 'js', kind: 'code', nodeId: 'js-1' })
        const { manifest, idx } = buildContext([js])
        const lines = renderReferenceRecipes(skillEntry(['js-1']), manifest, idx, 'bash_skill')
        expect(lines).toHaveLength(1)
        expect(lines[0]).toContain('node /home/user/skills/a.js [args...]')
        expect(lines[0]).toContain('`bash_skill`')
    })

    it('emits primary + 2 productive alternatives for data references (peek primary, search + read alts)', () => {
        const txt = makeEntry({ relPath: 'jd.txt', extension: 'txt', kind: 'data', nodeId: 'jd-1' })
        const { manifest, idx } = buildContext([txt])
        const lines = renderReferenceRecipes(skillEntry(['jd-1']), manifest, idx, 'bash_skill')
        expect(lines).toHaveLength(3)
        // Primary is a peek so the LLM doesn't start by cat-ing the whole JD.
        expect(lines[0]).toContain('head -n 50 /home/user/skills/jd.txt')
        expect(lines[0]).not.toContain('cat /home/user/skills/jd.txt')
        // Productive alternatives include search (highest priority) and the
        // `cat` escalation (`read` ranks above `count`).
        expect(lines.slice(1).some((l) => l.includes('grep -nE'))).toBe(true)
        expect(lines.slice(1).some((l) => l.includes('cat /home/user/skills/jd.txt'))).toBe(true)
    })

    it('emits a peek primary for markdown references (cat is demoted to an alt)', () => {
        const md = makeEntry({ relPath: 'doc.md', extension: 'md', kind: 'skill', nodeId: 'md-1' })
        const { manifest, idx } = buildContext([md])
        const lines = renderReferenceRecipes(skillEntry(['md-1']), manifest, idx, 'bash_skill')
        expect(lines[0]).toContain('head -n 80 /home/user/skills/doc.md')
        expect(lines[0]).not.toContain('cat /home/user/skills/doc.md')
        // The escalation path (cat) is still surfaced as an alternative.
        expect(lines.slice(1).some((l) => l.includes('cat /home/user/skills/doc.md'))).toBe(true)
    })

    it('emits a byte-peek primary for JSON references (jq + search as alts)', () => {
        const json = makeEntry({ relPath: 'data.json', extension: 'json', kind: 'data', nodeId: 'json-1' })
        const { manifest, idx } = buildContext([json])
        const lines = renderReferenceRecipes(skillEntry(['json-1']), manifest, idx, 'bash_skill')
        expect(lines[0]).toContain('head -c 2048 /home/user/skills/data.json')
        expect(lines[0]).not.toContain('cat /home/user/skills/data.json')
        expect(lines.slice(1).some((l) => l.includes("jq '<query>'"))).toBe(true)
    })

    it('emits primary + 2 productive alternatives for binary references', () => {
        const pdf = makeEntry({ relPath: 'spec.pdf', extension: 'pdf', kind: 'binary', nodeId: 'pdf-1' })
        const { manifest, idx } = buildContext([pdf])
        const lines = renderReferenceRecipes(skillEntry(['pdf-1']), manifest, idx, 'bash_skill')
        expect(lines).toHaveLength(3)
        expect(lines[0]).toContain('pdftotext -layout /home/user/skills/spec.pdf -')
        expect(lines.slice(1).some((l) => l.includes('pdfgrep'))).toBe(true)
        expect(lines.slice(1).some((l) => l.includes('pdfinfo'))).toBe(true)
    })

    it('dedupes references and skips unknown nodeIds', () => {
        const js = makeEntry({ relPath: 'a.js', extension: 'js', kind: 'code', nodeId: 'js-1' })
        const { manifest, idx } = buildContext([js])
        const entry = skillEntry(['js-1', 'js-1', 'unknown'])
        const lines = renderReferenceRecipes(entry, manifest, idx, 'bash_skill')
        expect(lines).toHaveLength(1)
    })

    it('returns an empty array when there are no references', () => {
        const { manifest, idx } = buildContext([])
        expect(renderReferenceRecipes(skillEntry([]), manifest, idx, 'bash_skill')).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// buildBashToolDescription — snapshot
// ---------------------------------------------------------------------------

describe('buildBashToolDescription', () => {
    it('renders intro + productivity tips + per-file primary + per-family productive sections', () => {
        const manifest = makeManifest([
            makeEntry({ relPath: 'resume-screener.md', extension: 'md', kind: 'skill' }),
            makeEntry({ relPath: 'job-description.txt', extension: 'txt', kind: 'data' }),
            makeEntry({ relPath: 'data.json', extension: 'json', kind: 'data' }),
            makeEntry({ relPath: 'rows.csv', extension: 'csv', kind: 'data' }),
            makeEntry({ relPath: 'app.log', extension: 'log', kind: 'data' }),
            makeEntry({ relPath: 'scoring_algorithm.js', extension: 'js', kind: 'code' }),
            makeEntry({ relPath: 'analyze.py', extension: 'py', kind: 'code' }),
            makeEntry({ relPath: 'spec.pdf', extension: 'pdf', kind: 'binary' }),
            makeEntry({ relPath: 'archive.zip', extension: 'zip', kind: 'binary' }),
            makeEntry({ relPath: 'logo.png', extension: 'png', kind: 'binary' }),
            makeEntry({ relPath: 'unknown.bin', extension: 'bin', kind: 'binary' })
        ])

        const description = buildBashToolDescription(manifest, 'E2B (Bash session)')

        // Intro
        expect(description).toContain('Run a shell command inside the skill sandbox VM (engine: E2B (Bash session))')
        expect(description).toContain('/home/user/skills')

        // Productivity rules
        expect(description).toContain('Productivity rules')
        expect(description).toContain('DO NOT default to `cat` for data files')
        expect(description).toContain('grep -nE')
        expect(description).toContain('jq')
        expect(description).toContain('wc -c')

        // Per-file starter commands — none of the data/markdown entries
        // should start with `cat`; the LLM is steered toward peeks/probes.
        expect(description).toContain('Starter commands per file')
        expect(description).toContain('resume-screener.md → head -n 80 /home/user/skills/resume-screener.md')
        expect(description).toContain('job-description.txt → head -n 50 /home/user/skills/job-description.txt')
        expect(description).toContain('data.json → head -c 2048 /home/user/skills/data.json')
        expect(description).toContain('scoring_algorithm.js → node /home/user/skills/scoring_algorithm.js [args...]')
        expect(description).toContain('analyze.py → python3 /home/user/skills/analyze.py [args...]')
        expect(description).toContain('spec.pdf → pdftotext -layout /home/user/skills/spec.pdf -')
        expect(description).toContain('archive.zip → unzip -l /home/user/skills/archive.zip')
        expect(description).toContain('app.log → tail -n 50 /home/user/skills/app.log')

        // No `cat` should appear in the per-file starter section. Every
        // family that used to default to `cat` now defaults to a peek.
        const starterSection = description.slice(
            description.indexOf('Starter commands per file'),
            description.indexOf('Productive commands per family')
        )
        expect(starterSection).not.toMatch(/→ cat /)

        // Per-family productive commands — `cat` is still reachable here
        // as the explicit "Read full" escalation.
        expect(description).toContain('Productive commands per family')
        expect(description).toContain("jq '<query>' <path>")
        expect(description).toContain("pdfgrep -n '<pattern>' <path>")
        expect(description).toContain('cat <path>')

        // Stays under ~6 KB even with this maximally-varied 11-family
        // manifest. Realistic manifests touch 2–4 families and stay well
        // under 3 KB; the productive-commands block + the explicit
        // "Read full (cat)" escalation alt is what dominates when every
        // family is exercised.
        expect(description.length).toBeLessThan(6000)
    })

    it('handles an empty manifest gracefully', () => {
        const description = buildBashToolDescription(makeManifest([]), 'E2B')
        expect(description).toContain('No skill files were reachable')
        expect(description).not.toContain('Productive commands per family')
    })

    it('renders the "Built-in helpers" section when manifest.helpers is non-empty', () => {
        const entries = [makeEntry({ relPath: 'spec.pdf', extension: 'pdf', kind: 'binary' })]
        const helpers = [makeHelper('pdf_extract')]
        const description = buildBashToolDescription(makeManifest(entries, helpers), 'E2B')

        expect(description).toContain('Built-in helpers (always available under /home/user/helpers):')
        expect(description).toContain('pdf_extract.py')
        expect(description).toContain('python3 /home/user/helpers/pdf_extract.py <path>')
    })

    it('omits the "Built-in helpers" section when manifest.helpers is empty', () => {
        const entries = [makeEntry({ relPath: 'spec.pdf', extension: 'pdf', kind: 'binary' })]
        const description = buildBashToolDescription(makeManifest(entries, []), 'E2B')
        expect(description).not.toContain('Built-in helpers')
    })

    it('routes binary-pdf entries to the helper template when helpers are materialised', () => {
        const entries = [makeEntry({ relPath: 'spec.pdf', extension: 'pdf', kind: 'binary' })]
        const helpers = [makeHelper('pdf_extract')]
        const description = buildBashToolDescription(makeManifest(entries, helpers), 'E2B')
        // Per-file starter for spec.pdf now uses the helper; pdftotext
        // is demoted to the per-family productive block (still present).
        expect(description).toContain('spec.pdf → python3 /home/user/helpers/pdf_extract.py /home/user/skills/spec.pdf')
        expect(description).toContain('pdftotext -layout <path> -')
    })

    it('keeps the legacy pdftotext primary when helpers are NOT materialised', () => {
        const entries = [makeEntry({ relPath: 'spec.pdf', extension: 'pdf', kind: 'binary' })]
        const description = buildBashToolDescription(makeManifest(entries, []), 'E2B')
        expect(description).toContain('spec.pdf → pdftotext -layout /home/user/skills/spec.pdf -')
        expect(description).not.toContain('python3 /home/user/helpers/pdf_extract.py')
    })
})

// ---------------------------------------------------------------------------
// Helper-aware family selection — helpersAvailable flag flips affected
// families to their helper-promoted variant; everything else is untouched.
// ---------------------------------------------------------------------------

describe('recipeForEntry — helper awareness', () => {
    it('returns the helper-promoted binary-pdf family when helpersAvailable=true', () => {
        const def = recipeForEntry(makeEntry({ relPath: 'doc.pdf', extension: 'pdf', kind: 'binary' }), {
            helpersAvailable: true
        })
        expect(def.family).toBe('binary-pdf')
        expect(def.primary.template).toMatch(/pdf_extract\.py/)
        expect(def.primary.label).toMatch(/built-in helper/i)
        // pdftotext is preserved as an alternative so the LLM can escalate.
        expect(def.alternatives.some((a) => a.template.includes('pdftotext'))).toBe(true)
    })

    it('returns the legacy native binary-pdf family when helpersAvailable is omitted/false', () => {
        const def = recipeForEntry(makeEntry({ relPath: 'doc.pdf', extension: 'pdf', kind: 'binary' }))
        expect(def.family).toBe('binary-pdf')
        expect(def.primary.template).toBe('pdftotext -layout {path} -')
    })

    it('does not affect families without a helper override (e.g. binary-image)', () => {
        const a = recipeForEntry(makeEntry({ relPath: 'pic.png', extension: 'png', kind: 'binary' }), {
            helpersAvailable: true
        })
        const b = recipeForEntry(makeEntry({ relPath: 'pic.png', extension: 'png', kind: 'binary' }))
        expect(a.primary.template).toBe(b.primary.template)
    })

    // M3 — DOCX / XLSX / PPTX / HTML each get their own helper-promoted variant.
    const helperPromotedCases: Array<{ ext: string; family: string; expectedTemplateContains: string; nativeContains: string }> = [
        { ext: 'docx', family: 'binary-docx', expectedTemplateContains: 'docx_extract.py', nativeContains: 'unzip -l' },
        { ext: 'xlsx', family: 'binary-xlsx', expectedTemplateContains: 'xlsx_extract.py', nativeContains: 'unzip -l' },
        { ext: 'pptx', family: 'binary-pptx', expectedTemplateContains: 'pptx_extract.py', nativeContains: 'unzip -l' },
        { ext: 'html', family: 'data-html', expectedTemplateContains: 'html_to_text.py', nativeContains: 'head -n 80' },
        { ext: 'htm', family: 'data-html', expectedTemplateContains: 'html_to_text.py', nativeContains: 'head -n 80' }
    ]

    for (const { ext, family, expectedTemplateContains, nativeContains } of helperPromotedCases) {
        it(`promotes ${family} (.${ext}) to its built-in helper when helpersAvailable=true`, () => {
            const def = recipeForEntry(
                makeEntry({
                    relPath: `f.${ext}`,
                    extension: ext,
                    kind: ext === 'html' || ext === 'htm' ? 'data' : 'binary'
                }),
                { helpersAvailable: true }
            )
            expect(def.family).toBe(family)
            expect(def.primary.template).toContain(expectedTemplateContains)
            // Native fallback is preserved as an alternative so the LLM can escalate.
            expect(def.alternatives.some((a) => a.template.includes(nativeContains))).toBe(true)
        })

        it(`returns the legacy ${family} (.${ext}) family when helpersAvailable is omitted/false`, () => {
            const def = recipeForEntry(
                makeEntry({
                    relPath: `f.${ext}`,
                    extension: ext,
                    kind: ext === 'html' || ext === 'htm' ? 'data' : 'binary'
                })
            )
            expect(def.family).toBe(family)
            expect(def.primary.template).not.toContain(expectedTemplateContains)
        })
    }
})

describe('groupByRecipeFamily — helper awareness', () => {
    it('passes helpersAvailable through to family selection so groups carry the helper variant', () => {
        const groups = groupByRecipeFamily([makeEntry({ relPath: 'doc.pdf', extension: 'pdf', kind: 'binary' })], {
            helpersAvailable: true
        })
        const pdfGroup = groups.find((g) => g.family === 'binary-pdf')!
        expect(pdfGroup.def.primary.template).toMatch(/pdf_extract\.py/)
    })
})

// ---------------------------------------------------------------------------
// renderHelperCatalog
// ---------------------------------------------------------------------------

describe('renderHelperCatalog', () => {
    it('returns an empty array when manifest.helpers is empty', () => {
        expect(renderHelperCatalog(makeManifest([], []))).toEqual([])
    })

    it('emits one line per helper, with the manifest helpersDir baked in', () => {
        const lines = renderHelperCatalog(makeManifest([], [makeHelper('pdf_extract')]))
        expect(lines).toHaveLength(1)
        expect(lines[0]).toContain('pdf_extract.py')
        expect(lines[0]).toContain('python3 /home/user/helpers/pdf_extract.py <path>')
    })

    it('honours a non-default helpersDir', () => {
        const m = makeManifest([], [makeHelper('pdf_extract')])
        m.helpersDir = '/sandbox/h'
        const lines = renderHelperCatalog(m)
        expect(lines[0]).toContain('python3 /sandbox/h/pdf_extract.py <path>')
    })
})

// ---------------------------------------------------------------------------
// formatTaskCommand — {helpers_dir} substitution
// ---------------------------------------------------------------------------

describe('formatTaskCommand — {helpers_dir} token', () => {
    it('substitutes {helpers_dir} with the supplied helpersDir', () => {
        const cmd = formatTaskCommand(
            { id: 'read', label: 'x', template: 'python3 {helpers_dir}/pdf_extract.py {path}', description: '' },
            '/home/user/skills/spec.pdf',
            undefined,
            '/home/user/helpers'
        )
        expect(cmd).toBe('python3 /home/user/helpers/pdf_extract.py /home/user/skills/spec.pdf')
    })

    it('falls back to DEFAULT_HELPERS_DIR when helpersDir is not supplied', () => {
        const cmd = formatTaskCommand(
            { id: 'read', label: 'x', template: 'python3 {helpers_dir}/pdf_extract.py {path}', description: '' },
            '/abs/spec.pdf'
        )
        expect(cmd).toBe('python3 /home/user/helpers/pdf_extract.py /abs/spec.pdf')
    })

    it('leaves templates without {helpers_dir} unaffected (backwards compatibility)', () => {
        const cmd = formatTaskCommand(
            { id: 'read', label: 'x', template: 'cat {path}', description: '' },
            '/abs/spec.pdf',
            undefined,
            '/home/user/helpers'
        )
        expect(cmd).toBe('cat /abs/spec.pdf')
    })
})

// ---------------------------------------------------------------------------
// renderReferenceRecipes — helper-aware via manifest.helpers.length
// ---------------------------------------------------------------------------

describe('renderReferenceRecipes — helper awareness', () => {
    const skillEntry = (refs: string[]): SkillBundleEntry => ({
        nodeId: 'skill-1',
        kind: 'skill',
        name: 's.md',
        path: 's.md',
        content: '',
        tools: { dependencies: [], references: [] },
        files: { references: refs.map((nodeId) => ({ source: 'app', nodeId })) }
    })

    it('emits the helper-promoted command for PDF references when manifest.helpers is non-empty', () => {
        const target = makeEntry({ relPath: 'spec.pdf', extension: 'pdf', kind: 'binary', nodeId: 'pdf-1' })
        const manifest = makeManifest([target], [makeHelper('pdf_extract')])
        const idx = new Map([[target.nodeId, target]])
        const lines = renderReferenceRecipes(skillEntry(['pdf-1']), manifest, idx, 'bash_T')
        expect(lines[0]).toContain('python3 /home/user/helpers/pdf_extract.py /home/user/skills/spec.pdf')
    })

    it('emits the legacy native command for PDF references when manifest.helpers is empty', () => {
        const target = makeEntry({ relPath: 'spec.pdf', extension: 'pdf', kind: 'binary', nodeId: 'pdf-1' })
        const manifest = makeManifest([target], [])
        const idx = new Map([[target.nodeId, target]])
        const lines = renderReferenceRecipes(skillEntry(['pdf-1']), manifest, idx, 'bash_T')
        expect(lines[0]).toContain('pdftotext -layout /home/user/skills/spec.pdf -')
        expect(lines.join('\n')).not.toContain('pdf_extract.py')
    })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pickExtFor = (fam: RecipeFamily): string => {
    switch (fam) {
        case 'exec-node':
            return 'js'
        case 'exec-python':
            return 'py'
        case 'exec-shell':
            return 'sh'
        case 'exec-ruby':
            return 'rb'
        case 'data-md':
            return 'md'
        case 'data-text':
            return 'txt'
        case 'data-log':
            return 'log'
        case 'data-json':
            return 'json'
        case 'data-csv':
            return 'csv'
        case 'data-tsv':
            return 'tsv'
        case 'data-yaml':
            return 'yaml'
        case 'data-xml':
            return 'xml'
        case 'data-html':
            return 'html'
        case 'binary-pdf':
            return 'pdf'
        case 'binary-docx':
            return 'docx'
        case 'binary-xlsx':
            return 'xlsx'
        case 'binary-pptx':
            return 'pptx'
        case 'binary-archive':
            return 'zip'
        case 'binary-image':
            return 'png'
        case 'binary-other':
            return 'bin'
    }
}

const pickKindFor = (fam: RecipeFamily): SandboxManifestEntry['kind'] => {
    if (fam.startsWith('exec-')) return 'code'
    if (fam === 'data-md') return 'skill'
    if (fam.startsWith('data-')) return 'data'
    return 'binary'
}

// Reference unused-import safe symbols so TypeScript doesn't warn under
// `noUnusedLocals`/`noUnusedParameters` (some configs flag type-only
// imports that aren't directly referenced in runtime code).
type _Unused = FamilyDef
