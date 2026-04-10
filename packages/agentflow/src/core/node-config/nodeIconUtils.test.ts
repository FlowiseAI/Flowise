import { getAgentflowIcon, getNodeColor } from './nodeIconUtils'

describe('getAgentflowIcon', () => {
    it('should return icon config for known node', () => {
        const icon = getAgentflowIcon('startAgentflow')
        expect(icon).toBeDefined()
        expect(icon!.name).toBe('startAgentflow')
        expect(icon!.color).toBe('#7EE787')
    })

    it('should return undefined for unknown node', () => {
        expect(getAgentflowIcon('unknownNode')).toBeUndefined()
    })

    it('should return icon config for all default nodes', () => {
        const knownNodes = ['conditionAgentflow', 'llmAgentflow', 'agentAgentflow', 'directReplyAgentflow']
        knownNodes.forEach((name) => {
            expect(getAgentflowIcon(name)).toBeDefined()
        })
    })
})

describe('getNodeColor', () => {
    it('should return correct color for known node', () => {
        expect(getNodeColor('llmAgentflow')).toBe('#64B5F6')
    })

    it('should return default gray for unknown node', () => {
        expect(getNodeColor('unknownNode')).toBe('#9e9e9e')
    })

    it('should return default gray for empty string', () => {
        expect(getNodeColor('')).toBe('#9e9e9e')
    })
})
