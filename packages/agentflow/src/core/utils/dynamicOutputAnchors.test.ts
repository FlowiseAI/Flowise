import { buildDynamicOutputAnchors } from './dynamicOutputAnchors'

describe('buildDynamicOutputAnchors', () => {
    it('should generate one condition anchor plus Else for a single condition', () => {
        const anchors = buildDynamicOutputAnchors('node-1', 1, 'Condition')

        expect(anchors).toEqual([
            { id: 'node-1-output-0', name: '0', label: 'Condition 0', type: 'Condition' },
            { id: 'node-1-output-1', name: '1', label: 'Else', type: 'Condition' }
        ])
    })

    it('should generate multiple condition anchors plus Else', () => {
        const anchors = buildDynamicOutputAnchors('node-2', 3, 'Condition')

        expect(anchors).toHaveLength(4)
        expect(anchors[0]).toEqual({ id: 'node-2-output-0', name: '0', label: 'Condition 0', type: 'Condition' })
        expect(anchors[1]).toEqual({ id: 'node-2-output-1', name: '1', label: 'Condition 1', type: 'Condition' })
        expect(anchors[2]).toEqual({ id: 'node-2-output-2', name: '2', label: 'Condition 2', type: 'Condition' })
        expect(anchors[3]).toEqual({ id: 'node-2-output-3', name: '3', label: 'Else', type: 'Condition' })
    })

    it('should generate only Else anchor for zero conditions', () => {
        const anchors = buildDynamicOutputAnchors('node-3', 0, 'Condition')

        expect(anchors).toEqual([{ id: 'node-3-output-0', name: '0', label: 'Else', type: 'Condition' }])
    })

    it('should use the provided nodeId in anchor ids', () => {
        const anchors = buildDynamicOutputAnchors('conditionAgentflow_0', 2, 'Condition')

        expect(anchors.every((a) => a.id.startsWith('conditionAgentflow_0-output-'))).toBe(true)
    })

    it('should use a custom labelPrefix for scenario anchors', () => {
        const anchors = buildDynamicOutputAnchors('node-5', 2, 'Scenario')

        expect(anchors).toEqual([
            { id: 'node-5-output-0', name: '0', label: 'Scenario 0', type: 'Scenario' },
            { id: 'node-5-output-1', name: '1', label: 'Scenario 1', type: 'Scenario' },
            { id: 'node-5-output-2', name: '2', label: 'Else', type: 'Scenario' }
        ])
    })

    it('should omit Else anchor when includeElse is false', () => {
        const anchors = buildDynamicOutputAnchors('node-6', 2, 'Condition', false)

        expect(anchors).toEqual([
            { id: 'node-6-output-0', name: '0', label: 'Condition 0', type: 'Condition' },
            { id: 'node-6-output-1', name: '1', label: 'Condition 1', type: 'Condition' }
        ])
    })
})
