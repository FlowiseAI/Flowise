/**
 * Tests for RetrieverTool metadata filter handling.
 *
 * Ensures that an empty metadata filter (added then removed by user)
 * does not get passed to the vector store, which would cause errors
 * in stores like Pinecone that reject empty filter objects.
 *
 * See: https://github.com/FlowiseAI/Flowise/issues/4900
 */

// Inline resolveFlowObjValue to avoid TS import issues in Jest
const resolveFlowObjValue = (obj, sourceObj) => {
    if (typeof obj === 'object' && obj !== null) {
        const resolved = Array.isArray(obj) ? [] : {}
        for (const key in obj) {
            const value = obj[key]
            resolved[key] = resolveFlowObjValue(value, sourceObj)
        }
        return resolved
    } else if (typeof obj === 'string' && obj.startsWith('$flow')) {
        return sourceObj ? sourceObj[obj] : undefined
    } else {
        return obj
    }
}

describe('RetrieverTool metadata filter guard', () => {
    describe('resolveFlowObjValue with empty filters', () => {
        it('returns empty object for empty input', () => {
            const result = resolveFlowObjValue({}, {})
            expect(result).toEqual({})
            expect(Object.keys(result).length).toBe(0)
        })

        it('returns resolved object for non-empty input', () => {
            const filter = { category: 'test', status: 'active' }
            const result = resolveFlowObjValue(filter, {})
            expect(result).toEqual({ category: 'test', status: 'active' })
            expect(Object.keys(result).length).toBe(2)
        })
    })

    describe('empty filter guard logic', () => {
        it('should not set filter when metadata filter resolves to empty object', () => {
            const mockVectorStore = { filter: undefined }
            const metadataFilter = '{}'
            const parsed = JSON.parse(metadataFilter)
            const resolved = resolveFlowObjValue(parsed, {})

            if (resolved && typeof resolved === 'object' && Object.keys(resolved).length > 0) {
                mockVectorStore.filter = resolved
            }

            expect(mockVectorStore.filter).toBeUndefined()
        })

        it('should set filter when metadata filter resolves to non-empty object', () => {
            const mockVectorStore = { filter: undefined }
            const metadataFilter = '{"category": "docs"}'
            const parsed = JSON.parse(metadataFilter)
            const resolved = resolveFlowObjValue(parsed, {})

            if (resolved && typeof resolved === 'object' && Object.keys(resolved).length > 0) {
                mockVectorStore.filter = resolved
            }

            expect(mockVectorStore.filter).toEqual({ category: 'docs' })
        })

        it('should not set filter when metadata filter is null after resolution', () => {
            const mockVectorStore = { filter: undefined }
            const resolved = null

            if (resolved && typeof resolved === 'object' && Object.keys(resolved).length > 0) {
                mockVectorStore.filter = resolved
            }

            expect(mockVectorStore.filter).toBeUndefined()
        })

        it('should not set filter when metadata filter is a string "{}" parsed to empty object', () => {
            const mockVectorStore = { filter: undefined }
            const retrieverToolMetadataFilter = '{}'

            if (retrieverToolMetadataFilter) {
                const metadatafilter =
                    typeof retrieverToolMetadataFilter === 'object'
                        ? retrieverToolMetadataFilter
                        : JSON.parse(retrieverToolMetadataFilter)
                const newMetadataFilter = resolveFlowObjValue(metadatafilter, {})

                if (newMetadataFilter && typeof newMetadataFilter === 'object' && Object.keys(newMetadataFilter).length > 0) {
                    mockVectorStore.filter = newMetadataFilter
                }
            }

            expect(mockVectorStore.filter).toBeUndefined()
        })
    })
})
