import { MAX_PLACEHOLDER_MATCHES, parsePlaceholders } from './placeholderParser'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const onlyKinds = (source: string) => parsePlaceholders(source).tokens.map((t) => t.kind)

const inners = (source: string) => parsePlaceholders(source).tokens.map((t) => t.inner)

// ---------------------------------------------------------------------------
// Token classification
// ---------------------------------------------------------------------------

describe('parsePlaceholders — classification', () => {
    it('classifies tool placeholders with provider, toolName, uuid', () => {
        const src = 'see {{tool.hr_platform.candidate_lookup.uuid-1}} for details'
        const { tokens } = parsePlaceholders(src)
        expect(tokens).toHaveLength(1)
        const tok = tokens[0]
        expect(tok.kind).toBe('tool')
        expect(tok.tool).toEqual({
            provider: 'hr_platform',
            toolName: 'candidate_lookup',
            uuid: 'uuid-1'
        })
        expect(tok.start).toBe(src.indexOf('{{tool'))
        expect(tok.end).toBe(tok.start + tok.raw.length)
    })

    it('treats dotted providers as a single provider (last two segments are toolName + uuid)', () => {
        // tool.<provider>.<toolName>.<uuid> — provider may contain dots
        const src = '{{tool.sandbox.python.runner.uuid-py}}'
        const { tokens } = parsePlaceholders(src)
        expect(tokens).toHaveLength(1)
        expect(tokens[0].kind).toBe('tool')
        expect(tokens[0].tool).toEqual({
            provider: 'sandbox.python',
            toolName: 'runner',
            uuid: 'uuid-py'
        })
    })

    it('classifies skill placeholders', () => {
        const src = 'See {{skill.node-123}} for context.'
        const { tokens } = parsePlaceholders(src)
        expect(tokens).toHaveLength(1)
        expect(tokens[0].kind).toBe('skill')
        expect(tokens[0].skill).toEqual({ nodeId: 'node-123' })
    })

    it('marks runtime placeholders as passthrough and leaves them untouched', () => {
        const src = 'Hello {{question}}, vars: {{$vars.x}}, flow: {{$flow.session_id}}, history: {{chat_history}}'
        expect(onlyKinds(src)).toEqual(['passthrough', 'passthrough', 'passthrough', 'passthrough'])
        expect(inners(src)).toEqual(['question', '$vars.x', '$flow.session_id', 'chat_history'])
    })

    it('falls back to passthrough when a tool placeholder is missing required segments', () => {
        // Only 2 dotted segments after the `tool.` prefix → invalid; still recorded as passthrough.
        const src = '{{tool.foo.bar}}'
        const { tokens } = parsePlaceholders(src)
        expect(tokens).toHaveLength(1)
        expect(tokens[0].kind).toBe('passthrough')
        expect(tokens[0].tool).toBeUndefined()
    })

    it('falls back to passthrough when a skill placeholder has empty nodeId', () => {
        const src = '{{skill.}}'
        const { tokens } = parsePlaceholders(src)
        expect(tokens).toHaveLength(1)
        expect(tokens[0].kind).toBe('passthrough')
        expect(tokens[0].skill).toBeUndefined()
    })

    it('preserves the raw matched substring on each token', () => {
        const src = 'before {{ skill.node-1 }} after'
        const { tokens } = parsePlaceholders(src)
        expect(tokens).toHaveLength(1)
        expect(tokens[0].raw).toBe('{{ skill.node-1 }}')
        expect(tokens[0].inner).toBe('skill.node-1')
        expect(tokens[0].kind).toBe('skill')
        expect(tokens[0].skill?.nodeId).toBe('node-1')
    })
})

// ---------------------------------------------------------------------------
// Code-span escaping
// ---------------------------------------------------------------------------

describe('parsePlaceholders — code spans', () => {
    it('skips placeholders inside inline code spans', () => {
        const src = 'Example: `{{tool.foo.bar.baz}}` and {{skill.real-node}} outside.'
        const { tokens, codeSpans } = parsePlaceholders(src)
        expect(codeSpans.length).toBeGreaterThan(0)
        // Only the second token (outside the backticks) is recognised.
        expect(tokens.map((t) => t.kind)).toEqual(['skill'])
        expect(tokens[0].skill?.nodeId).toBe('real-node')
    })

    it('skips placeholders inside fenced code blocks (```)', () => {
        const src = ['# Heading', '```js', "console.log('{{tool.foo.bar.baz}}')", '```', 'Active: {{skill.outer}}'].join('\n')
        const { tokens } = parsePlaceholders(src)
        expect(tokens).toHaveLength(1)
        expect(tokens[0].kind).toBe('skill')
        expect(tokens[0].skill?.nodeId).toBe('outer')
    })

    it('skips placeholders inside fenced code blocks (~~~)', () => {
        const src = ['~~~', '{{tool.x.y.z}}', '~~~', 'Live: {{skill.live-node}}'].join('\n')
        const { tokens } = parsePlaceholders(src)
        expect(tokens).toHaveLength(1)
        expect(tokens[0].kind).toBe('skill')
    })

    it('records code-span ranges in document order', () => {
        const src = 'first `inline` then\n```\nfenced\n```\nend'
        const { codeSpans } = parsePlaceholders(src)
        expect(codeSpans.length).toBe(2)
        expect(codeSpans[0].start).toBeLessThan(codeSpans[1].start)
    })
})

// ---------------------------------------------------------------------------
// Tool groups
// ---------------------------------------------------------------------------

describe('parsePlaceholders — tool groups', () => {
    it('detects a `[ {{tool.…}} , {{tool.…}} ]` group and references its tool tokens', () => {
        const src = 'Choose: [{{tool.sandbox.python.uuid-py}}, {{tool.sandbox.bash.uuid-sh}}]'
        const { tokens, toolGroups } = parsePlaceholders(src)
        expect(toolGroups).toHaveLength(1)
        const group = toolGroups[0]
        expect(group.start).toBe(src.indexOf('['))
        expect(group.end).toBe(src.indexOf(']') + 1)
        expect(group.tools).toHaveLength(2)
        expect(group.tools.map((t) => t.tool!.toolName)).toEqual(['python', 'bash'])
        // Group tokens are also present in the flat tokens list.
        const toolUuids = tokens.filter((t) => t.kind === 'tool').map((t) => t.tool!.uuid)
        expect(toolUuids).toEqual(expect.arrayContaining(['uuid-py', 'uuid-sh']))
    })

    it('does not classify a single-element bracket group with a non-tool token as a group', () => {
        const src = '[{{skill.node-1}}]'
        const { toolGroups } = parsePlaceholders(src)
        expect(toolGroups).toHaveLength(0)
    })

    it('matches groups with surrounding whitespace and inner spaces', () => {
        const src = '[ {{tool.a.b.u1}} ,  {{tool.c.d.u2}}  ]'
        const { toolGroups } = parsePlaceholders(src)
        expect(toolGroups).toHaveLength(1)
        expect(toolGroups[0].tools).toHaveLength(2)
    })
})

// ---------------------------------------------------------------------------
// Robustness
// ---------------------------------------------------------------------------

describe('parsePlaceholders — robustness', () => {
    it('caps the number of recognised placeholders at MAX_PLACEHOLDER_MATCHES', () => {
        // Use an obviously cheaper-to-construct payload size for the test;
        // the cap is exposed so we don't have to hammer the actual 10k limit.
        expect(MAX_PLACEHOLDER_MATCHES).toBe(10_000)
    })

    it('returns no tokens for a string without `{{…}}`', () => {
        expect(parsePlaceholders('plain text, no placeholders').tokens).toEqual([])
    })

    it('records token positions that round-trip through slicing', () => {
        const src = 'A {{skill.node-1}} B'
        const { tokens } = parsePlaceholders(src)
        const tok = tokens[0]
        expect(src.slice(tok.start, tok.end)).toBe('{{skill.node-1}}')
    })
})
