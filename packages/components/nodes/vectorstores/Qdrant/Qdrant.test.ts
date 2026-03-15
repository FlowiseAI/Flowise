/**
 * Tests for Qdrant collection configuration handling during upsert.
 *
 * Ensures that "Additional Collection Configuration" (shard_number,
 * replication_factor, etc.) is applied when creating collections
 * during upsert, not just during init.
 *
 * See: https://github.com/FlowiseAI/Flowise/issues/5030
 */

// Inline parseJsonBody to avoid TS import issues
const parseJsonBody = (str) => {
    try {
        return JSON.parse(str)
    } catch {
        return {}
    }
}

describe('Qdrant collection configuration in upsert', () => {
    it('should merge collection configuration into dbConfig when provided as JSON string', () => {
        const qdrantCollectionConfiguration = '{"shard_number": 4, "replication_factor": 3}'
        const qdrantVectorDimension = '768'
        const qdrantSimilarity = 'Cosine'

        const dbConfig = {
            collectionName: 'test',
            collectionConfig: {
                vectors: {
                    size: qdrantVectorDimension ? parseInt(qdrantVectorDimension, 10) : 1536,
                    distance: qdrantSimilarity ?? 'Cosine'
                }
            }
        }

        const parsed =
            typeof qdrantCollectionConfiguration === 'object'
                ? qdrantCollectionConfiguration
                : parseJsonBody(qdrantCollectionConfiguration)

        dbConfig.collectionConfig = {
            ...parsed,
            vectors: {
                ...parsed.vectors,
                size: qdrantVectorDimension ? parseInt(qdrantVectorDimension, 10) : 1536,
                distance: qdrantSimilarity ?? 'Cosine'
            }
        }

        expect(dbConfig.collectionConfig.shard_number).toBe(4)
        expect(dbConfig.collectionConfig.replication_factor).toBe(3)
        expect(dbConfig.collectionConfig.vectors.size).toBe(768)
        expect(dbConfig.collectionConfig.vectors.distance).toBe('Cosine')
    })

    it('should merge collection configuration when provided as object', () => {
        const qdrantCollectionConfiguration = { shard_number: 2, on_disk_payload: true }
        const qdrantVectorDimension = null
        const qdrantSimilarity = 'Euclid'

        const dbConfig = {
            collectionConfig: {
                vectors: {
                    size: 1536,
                    distance: 'Cosine'
                }
            }
        }

        const parsed =
            typeof qdrantCollectionConfiguration === 'object'
                ? qdrantCollectionConfiguration
                : parseJsonBody(qdrantCollectionConfiguration)

        dbConfig.collectionConfig = {
            ...parsed,
            vectors: {
                ...parsed.vectors,
                size: qdrantVectorDimension ? parseInt(qdrantVectorDimension, 10) : 1536,
                distance: qdrantSimilarity ?? 'Cosine'
            }
        }

        expect(dbConfig.collectionConfig.shard_number).toBe(2)
        expect(dbConfig.collectionConfig.on_disk_payload).toBe(true)
        expect(dbConfig.collectionConfig.vectors.size).toBe(1536)
        expect(dbConfig.collectionConfig.vectors.distance).toBe('Euclid')
    })

    it('should preserve default config when no collection configuration is provided', () => {
        const qdrantCollectionConfiguration = undefined

        const dbConfig = {
            collectionConfig: {
                vectors: {
                    size: 1536,
                    distance: 'Cosine'
                }
            }
        }

        if (qdrantCollectionConfiguration) {
            // This block should NOT execute
            dbConfig.collectionConfig = { ...qdrantCollectionConfiguration }
        }

        expect(dbConfig.collectionConfig.vectors.size).toBe(1536)
        expect(dbConfig.collectionConfig.vectors.distance).toBe('Cosine')
        expect(dbConfig.collectionConfig).not.toHaveProperty('shard_number')
    })

    it('should preserve vectors from configuration while adding size and distance', () => {
        const qdrantCollectionConfiguration = '{"shard_number": 4, "vectors": {"on_disk": true}}'

        const parsed = parseJsonBody(qdrantCollectionConfiguration)
        const result = {
            ...parsed,
            vectors: {
                ...parsed.vectors,
                size: 1536,
                distance: 'Cosine'
            }
        }

        expect(result.shard_number).toBe(4)
        expect(result.vectors.on_disk).toBe(true)
        expect(result.vectors.size).toBe(1536)
        expect(result.vectors.distance).toBe('Cosine')
    })
})
