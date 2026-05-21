import { SkillMetadata, ToolReference } from '../entities'
import { parsePlaceholders, PlaceholderToken } from './placeholderParser'
import { isToolEnabled, resolveToolLabel, toolDependencyFromToken, toolReferenceFromToken } from './toolResolver'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toolToken = (raw: string): PlaceholderToken => {
    const { tokens } = parsePlaceholders(raw)
    const tok = tokens.find((t) => t.kind === 'tool')
    if (!tok) throw new Error(`expected a tool token in ${raw}`)
    return tok
}

const skillToken = (raw: string): PlaceholderToken => {
    const { tokens } = parsePlaceholders(raw)
    const tok = tokens.find((t) => t.kind === 'skill')
    if (!tok) throw new Error(`expected a skill token in ${raw}`)
    return tok
}

const ref = (overrides: Partial<ToolReference> & Pick<ToolReference, 'uuid'>): ToolReference => ({
    type: 'custom',
    provider: 'hr_platform',
    toolName: 'candidate_lookup',
    enabled: true,
    ...overrides
})

const metaWith = (refs: ToolReference[]): SkillMetadata => ({
    tools: Object.fromEntries(refs.map((r) => [r.uuid, r]))
})

// ---------------------------------------------------------------------------
// resolveToolLabel
// ---------------------------------------------------------------------------

describe('resolveToolLabel', () => {
    it('uses metadata-driven pretty name when available', () => {
        const tok = toolToken('{{tool.hr_platform.candidate_lookup.uuid-1}}')
        const meta = metaWith([ref({ uuid: 'uuid-1' })])
        expect(resolveToolLabel(tok, meta)).toBe('[Candidate Lookup: hr_platform.candidate_lookup.uuid-1]')
    })

    it('falls back to title-cased toolName when metadata is missing', () => {
        const tok = toolToken('{{tool.sandbox.python_runner.uuid-py}}')
        expect(resolveToolLabel(tok, { tools: {} })).toBe('[Python Runner: sandbox.python_runner.uuid-py]')
    })

    it('handles multi-word toolNames separated by hyphens or underscores', () => {
        const tok = toolToken('{{tool.comms.send-email.uuid-em}}')
        expect(resolveToolLabel(tok, { tools: {} })).toBe('[Send Email: comms.send-email.uuid-em]')
    })

    it('returns the raw string when called with a non-tool token', () => {
        const tok = skillToken('{{skill.node-1}}')
        expect(resolveToolLabel(tok, { tools: {} })).toBe(tok.raw)
    })
})

// ---------------------------------------------------------------------------
// toolDependencyFromToken
// ---------------------------------------------------------------------------

describe('toolDependencyFromToken', () => {
    it('emits a (type, provider, toolName) triple from metadata', () => {
        const tok = toolToken('{{tool.comms.send_email.uuid-em}}')
        const meta = metaWith([ref({ uuid: 'uuid-em', type: 'custom', provider: 'comms', toolName: 'send_email' })])
        expect(toolDependencyFromToken(tok, meta)).toEqual({
            type: 'custom',
            provider: 'comms',
            toolName: 'send_email'
        })
    })

    it('defaults type to "custom" when metadata lookup misses', () => {
        const tok = toolToken('{{tool.sandbox.python.uuid-py}}')
        expect(toolDependencyFromToken(tok, { tools: {} })).toEqual({
            type: 'custom',
            provider: 'sandbox',
            toolName: 'python'
        })
    })

    it('returns null for non-tool tokens', () => {
        const tok = skillToken('{{skill.node-1}}')
        expect(toolDependencyFromToken(tok, { tools: {} })).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// toolReferenceFromToken
// ---------------------------------------------------------------------------

describe('toolReferenceFromToken', () => {
    it('returns a per-invocation ToolReference from metadata, including credentialId & config', () => {
        const tok = toolToken('{{tool.comms.send_email.uuid-em}}')
        const meta = metaWith([
            ref({
                uuid: 'uuid-em',
                type: 'custom',
                provider: 'comms',
                toolName: 'send_email',
                credentialId: 'cred-smtp',
                config: { region: 'eu' }
            })
        ])
        expect(toolReferenceFromToken(tok, meta)).toEqual({
            type: 'custom',
            provider: 'comms',
            toolName: 'send_email',
            uuid: 'uuid-em',
            credentialId: 'cred-smtp',
            enabled: true,
            config: { region: 'eu' }
        })
    })

    it('falls back to enabled: true and type: "custom" when metadata is missing', () => {
        const tok = toolToken('{{tool.foo.bar.uuid-x}}')
        expect(toolReferenceFromToken(tok, { tools: {} })).toEqual({
            type: 'custom',
            provider: 'foo',
            toolName: 'bar',
            uuid: 'uuid-x',
            credentialId: undefined,
            enabled: true,
            config: undefined
        })
    })

    it('preserves explicit enabled: false from metadata', () => {
        const tok = toolToken('{{tool.foo.bar.uuid-x}}')
        const meta = metaWith([ref({ uuid: 'uuid-x', enabled: false })])
        const out = toolReferenceFromToken(tok, meta)
        expect(out!.enabled).toBe(false)
    })

    it('returns null for non-tool tokens', () => {
        const tok = skillToken('{{skill.node-1}}')
        expect(toolReferenceFromToken(tok, { tools: {} })).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// isToolEnabled
// ---------------------------------------------------------------------------

describe('isToolEnabled', () => {
    it('returns true when metadata is missing (sensible default for placeholder authors)', () => {
        const tok = toolToken('{{tool.foo.bar.uuid-x}}')
        expect(isToolEnabled(tok, { tools: {} })).toBe(true)
    })

    it('returns true when metadata sets enabled: true', () => {
        const tok = toolToken('{{tool.foo.bar.uuid-x}}')
        const meta = metaWith([ref({ uuid: 'uuid-x', enabled: true })])
        expect(isToolEnabled(tok, meta)).toBe(true)
    })

    it('returns false when metadata sets enabled: false', () => {
        const tok = toolToken('{{tool.foo.bar.uuid-x}}')
        const meta = metaWith([ref({ uuid: 'uuid-x', enabled: false })])
        expect(isToolEnabled(tok, meta)).toBe(false)
    })

    it('returns false for non-tool tokens', () => {
        const tok = skillToken('{{skill.node-1}}')
        expect(isToolEnabled(tok, { tools: {} })).toBe(false)
    })
})
