import { buildDynamicOutputAnchors, getOutputHandleId, parseOutputHandleIndex } from './dynamicOutputAnchors'

describe('dynamicOutputAnchors', () => {
    describe('getOutputHandleId', () => {
        it('should return a deterministic handle ID', () => {
            expect(getOutputHandleId('node-1', 0)).toBe('node-1-output-0')
            expect(getOutputHandleId('node-1', 3)).toBe('node-1-output-3')
        })
    })

    describe('parseOutputHandleIndex', () => {
        it('should extract the index from a valid handle ID', () => {
            expect(parseOutputHandleIndex('node-1', 'node-1-output-0')).toBe(0)
            expect(parseOutputHandleIndex('node-1', 'node-1-output-5')).toBe(5)
        })

        it('should return NaN for a handle ID belonging to a different node', () => {
            expect(parseOutputHandleIndex('node-1', 'node-2-output-0')).toBeNaN()
        })

        it('should return NaN for a non-matching format', () => {
            expect(parseOutputHandleIndex('node-1', 'node-1-input-0')).toBeNaN()
        })
    })

    describe('buildDynamicOutputAnchors', () => {
        it('should generate one condition anchor plus Else for a single condition', () => {
            const anchors = buildDynamicOutputAnchors('node-1', 1, 'Condition')

            expect(anchors).toEqual([
                { id: 'node-1-output-0', name: '0', label: '0', type: 'Condition', description: 'Condition 0' },
                { id: 'node-1-output-1', name: '1', label: '1', type: 'Condition', description: 'Else' }
            ])
        })

        it('should generate multiple condition anchors plus Else', () => {
            const anchors = buildDynamicOutputAnchors('node-2', 3, 'Condition')

            expect(anchors).toHaveLength(4)
            expect(anchors[0]).toEqual({ id: 'node-2-output-0', name: '0', label: '0', type: 'Condition', description: 'Condition 0' })
            expect(anchors[1]).toEqual({ id: 'node-2-output-1', name: '1', label: '1', type: 'Condition', description: 'Condition 1' })
            expect(anchors[2]).toEqual({ id: 'node-2-output-2', name: '2', label: '2', type: 'Condition', description: 'Condition 2' })
            expect(anchors[3]).toEqual({ id: 'node-2-output-3', name: '3', label: '3', type: 'Condition', description: 'Else' })
        })

        it('should generate only Else anchor for zero conditions', () => {
            const anchors = buildDynamicOutputAnchors('node-3', 0, 'Condition')

            expect(anchors).toEqual([{ id: 'node-3-output-0', name: '0', label: '0', type: 'Condition', description: 'Else' }])
        })

        it('should use the provided nodeId in anchor ids', () => {
            const anchors = buildDynamicOutputAnchors('conditionAgentflow_0', 2, 'Condition')

            expect(anchors.every((a) => a.id.startsWith('conditionAgentflow_0-output-'))).toBe(true)
        })

        it('should use a custom labelPrefix for scenario anchors', () => {
            const anchors = buildDynamicOutputAnchors('node-5', 2, 'Scenario')

            expect(anchors).toEqual([
                { id: 'node-5-output-0', name: '0', label: '0', type: 'Scenario', description: 'Scenario 0' },
                { id: 'node-5-output-1', name: '1', label: '1', type: 'Scenario', description: 'Scenario 1' },
                { id: 'node-5-output-2', name: '2', label: '2', type: 'Scenario', description: 'Else' }
            ])
        })

        it('should omit Else anchor when includeElse is false', () => {
            const anchors = buildDynamicOutputAnchors('node-6', 2, 'Condition', false)

            expect(anchors).toEqual([
                { id: 'node-6-output-0', name: '0', label: '0', type: 'Condition', description: 'Condition 0' },
                { id: 'node-6-output-1', name: '1', label: '1', type: 'Condition', description: 'Condition 1' }
            ])
        })
    })
})
