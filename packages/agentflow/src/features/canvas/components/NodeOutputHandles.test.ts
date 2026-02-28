import { getMinimumNodeHeight } from './NodeOutputHandles'

// Constants mirrored from source for clarity
const MIN_NODE_HEIGHT = 60
const SPACING_PER_OUTPUT = 20
const BASE_HEIGHT_OFFSET = 40

describe('NodeOutputHandles', () => {
    describe('getMinimumNodeHeight', () => {
        it('should return MIN_NODE_HEIGHT when output count is 0', () => {
            expect(getMinimumNodeHeight(0)).toBe(MIN_NODE_HEIGHT)
        })

        it('should return MIN_NODE_HEIGHT when calculated height is less', () => {
            // 1 * 20 + 40 = 60, which equals MIN_NODE_HEIGHT
            expect(getMinimumNodeHeight(1)).toBe(MIN_NODE_HEIGHT)
        })

        it('should scale linearly with output count', () => {
            expect(getMinimumNodeHeight(3)).toBe(3 * SPACING_PER_OUTPUT + BASE_HEIGHT_OFFSET)
            expect(getMinimumNodeHeight(5)).toBe(5 * SPACING_PER_OUTPUT + BASE_HEIGHT_OFFSET)
            expect(getMinimumNodeHeight(10)).toBe(10 * SPACING_PER_OUTPUT + BASE_HEIGHT_OFFSET)
        })

        it('should handle large output counts', () => {
            expect(getMinimumNodeHeight(50)).toBe(50 * SPACING_PER_OUTPUT + BASE_HEIGHT_OFFSET)
        })
    })
})
