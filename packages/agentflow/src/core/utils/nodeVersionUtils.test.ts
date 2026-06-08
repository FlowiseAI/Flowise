import { makeNodeData, makeNodeDataSchema } from '@test-utils/factories'

import { initNode } from './nodeFactory'
import { getNodeVersionWarning, isNodeOutdated, upgradeNodeData } from './nodeVersionUtils'

jest.mock('./nodeFactory', () => ({
    initNode: jest.fn()
}))

const mockInitNode = initNode as jest.MockedFunction<typeof initNode>

// ─── isNodeOutdated ───────────────────────────────────────────────────────────

describe('isNodeOutdated', () => {
    it('returns false when nodeData has no version (aligns with V2 — missing version is not flagged)', () => {
        expect(isNodeOutdated(makeNodeData({ version: undefined }), makeNodeDataSchema({ version: 1.3 }))).toBe(false)
    })

    it('returns true when version is 0 (0 < 1.0 so it is outdated)', () => {
        expect(isNodeOutdated(makeNodeData({ version: 0 }), makeNodeDataSchema({ version: 1.0 }))).toBe(true)
    })

    it('returns true when nodeData.version is less than componentNode.version', () => {
        expect(isNodeOutdated(makeNodeData({ version: 1 }), makeNodeDataSchema({ version: 3.2 }))).toBe(true)
    })

    it('returns false when versions match', () => {
        expect(isNodeOutdated(makeNodeData({ version: 1.3 }), makeNodeDataSchema({ version: 1.3 }))).toBe(false)
    })

    it('returns false when componentNode has no version defined', () => {
        expect(isNodeOutdated(makeNodeData({ version: 1 }), makeNodeDataSchema({ version: undefined }))).toBe(false)
    })
})

// ─── getNodeVersionWarning ────────────────────────────────────────────────────

describe('getNodeVersionWarning', () => {
    it('returns generic outdated message when nodeData has no version but componentNode has one', () => {
        const result = getNodeVersionWarning(makeNodeData({ version: undefined }), makeNodeDataSchema({ version: 1.3 }))
        expect(result).toContain('Node outdated')
        expect(result).toContain('1.3')
    })

    it('includes the stale and current version numbers in the outdated message', () => {
        const result = getNodeVersionWarning(makeNodeData({ version: 1 }), makeNodeDataSchema({ version: 3.2 }))
        expect(result).toContain('Node version 1 outdated')
        expect(result).toContain('3.2')
    })

    it('returns null when versions match', () => {
        expect(getNodeVersionWarning(makeNodeData({ version: 1.3 }), makeNodeDataSchema({ version: 1.3 }))).toBeNull()
    })

    it('returns null when up to date and no badge or warning', () => {
        expect(getNodeVersionWarning(makeNodeData({ version: 1.0 }), makeNodeDataSchema({ version: 1.0 }))).toBeNull()
    })

    it('returns deprecateMessage when badge is DEPRECATING', () => {
        const cn = makeNodeDataSchema({ version: 1.0, badge: 'DEPRECATING', deprecateMessage: 'Use newNode instead' })
        expect(getNodeVersionWarning(makeNodeData({ version: 1.0 }), cn)).toBe('Use newNode instead')
    })

    it('returns default deprecation message when DEPRECATING badge has no deprecateMessage', () => {
        const cn = makeNodeDataSchema({ version: 1.0, badge: 'DEPRECATING' })
        const result = getNodeVersionWarning(makeNodeData({ version: 1.0 }), cn)
        expect(result).toContain('deprecated')
    })

    it('returns componentNode.warning when set and node is up to date', () => {
        const cn = makeNodeDataSchema({ version: 1.0, warning: 'This node is experimental' })
        expect(getNodeVersionWarning(makeNodeData({ version: 1.0 }), cn)).toBe('This node is experimental')
    })

    it('version check takes priority over deprecation badge', () => {
        const cn = makeNodeDataSchema({ version: 2.0, badge: 'DEPRECATING', deprecateMessage: 'Deprecated!' })
        const result = getNodeVersionWarning(makeNodeData({ version: 1 }), cn)
        expect(result).toContain('outdated')
        expect(result).not.toContain('Deprecated!')
    })

    it('deprecation badge takes priority over warning string', () => {
        const cn = makeNodeDataSchema({ version: 1.0, badge: 'DEPRECATING', deprecateMessage: 'Deprecated!', warning: 'Slow' })
        const result = getNodeVersionWarning(makeNodeData({ version: 1.0 }), cn)
        expect(result).toBe('Deprecated!')
    })
})

// ─── upgradeNodeData ──────────────────────────────────────────────────────────

describe('upgradeNodeData', () => {
    beforeEach(() => mockInitNode.mockReset())

    it('calls initNode with the component schema, existing node id, and resetToDefault=true', () => {
        mockInitNode.mockReturnValue(makeNodeData({ id: 'node_0', inputs: {} }))
        const cn = makeNodeDataSchema({ name: 'agentAgentflow' })
        upgradeNodeData(cn, makeNodeData({ id: 'node_0', label: 'Node', inputs: {} }))
        expect(mockInitNode).toHaveBeenCalledWith(cn, 'node_0', true)
    })

    it('preserves credential from existing data', () => {
        mockInitNode.mockReturnValue(makeNodeData({ id: 'node_0', inputs: {} }))
        const result = upgradeNodeData(makeNodeDataSchema(), makeNodeData({ id: 'node_0', credential: 'cred-abc', label: 'N', inputs: {} }))
        expect(result.credential).toBe('cred-abc')
    })

    it('preserves existing input values that are present in the upgraded schema', () => {
        mockInitNode.mockReturnValue(makeNodeData({ id: 'node_0', inputs: { llmModel: '', temperature: 0 } }))
        const existing = makeNodeData({ id: 'node_0', label: 'N', inputs: { llmModel: 'gpt-4', temperature: 0.7 } })
        const result = upgradeNodeData(makeNodeDataSchema(), existing)
        expect(result.inputs?.llmModel).toBe('gpt-4')
        expect(result.inputs?.temperature).toBe(0.7)
    })

    it('does not carry over input keys that are absent from the upgraded schema', () => {
        mockInitNode.mockReturnValue(makeNodeData({ id: 'node_0', inputs: { newField: '' } }))
        const existing = makeNodeData({ id: 'node_0', label: 'N', inputs: { removedField: 'value' } })
        const result = upgradeNodeData(makeNodeDataSchema(), existing)
        expect(result.inputs?.removedField).toBeUndefined()
    })

    it('preserves *Config keys even when absent from the upgraded schema', () => {
        mockInitNode.mockReturnValue(makeNodeData({ id: 'node_0', inputs: { agentModel: '' } }))
        const existing = makeNodeData({ id: 'node_0', label: 'N', inputs: { agentModelConfig: { modelName: 'gpt-4' } } })
        const result = upgradeNodeData(makeNodeDataSchema(), existing)
        expect(result.inputs?.agentModelConfig).toEqual({ modelName: 'gpt-4' })
    })

    it('preserves the label from existing data', () => {
        mockInitNode.mockReturnValue(makeNodeData({ id: 'node_0', inputs: {} }))
        const result = upgradeNodeData(makeNodeDataSchema(), makeNodeData({ id: 'node_0', label: 'My Custom Label', inputs: {} }))
        expect(result.label).toBe('My Custom Label')
    })
})
