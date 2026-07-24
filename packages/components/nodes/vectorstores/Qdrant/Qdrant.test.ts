import { Document } from '@langchain/core/documents'

// Mock the Qdrant REST client the way AWSDynamoDBKVStorage.test.ts mocks @aws-sdk/client-dynamodb:
// capture jest.fn()s for each method actually called by Qdrant.ts / @langchain/qdrant.
jest.mock('@qdrant/js-client-rest', () => {
    const getCollectionsMock = jest.fn()
    const createCollectionMock = jest.fn()
    const upsertMock = jest.fn()
    // Sparse/Hybrid collection create-or-validate path (Qdrant.ensureCollectionForRetrievalMode)
    // and direct query path — not used by @langchain/qdrant's own ensureCollection(), which only
    // ever calls getCollections/createCollection above.
    const collectionExistsMock = jest.fn()
    const getCollectionMock = jest.fn()
    // No code path calls updateCollection anymore (Qdrant has no in-place way to add a named
    // vector to an existing collection — see qdrant/qdrant#8892), so this mock exists purely as
    // a regression guard: tests assert it's never called.
    const updateCollectionMock = jest.fn()
    const queryMock = jest.fn()
    const deleteMock = jest.fn()

    return {
        QdrantClient: jest.fn().mockImplementation(() => ({
            getCollections: getCollectionsMock,
            createCollection: createCollectionMock,
            upsert: upsertMock,
            collectionExists: collectionExistsMock,
            getCollection: getCollectionMock,
            updateCollection: updateCollectionMock,
            query: queryMock,
            delete: deleteMock
        })),
        __getCollectionsMock: getCollectionsMock,
        __createCollectionMock: createCollectionMock,
        __upsertMock: upsertMock,
        __collectionExistsMock: collectionExistsMock,
        __getCollectionMock: getCollectionMock,
        __updateCollectionMock: updateCollectionMock,
        __queryMock: queryMock
    }
})

describe('Qdrant', () => {
    let Qdrant_VectorStores: any
    let getCollectionsMock: jest.Mock
    let createCollectionMock: jest.Mock
    let upsertMock: jest.Mock
    let collectionExistsMock: jest.Mock
    let getCollectionMock: jest.Mock
    let updateCollectionMock: jest.Mock
    let queryMock: jest.Mock
    let fakeEmbeddings: { embedQuery: jest.Mock; embedDocuments: jest.Mock }

    // Minimal fake Embeddings-shaped object. embedQuery's fixed-length return also sizes the
    // ensureCollection() fallback path when no collectionConfig is supplied.
    const createFakeEmbeddings = () => ({
        embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4]),
        embedDocuments: jest.fn((texts: string[]) => Promise.resolve(texts.map(() => [0.1, 0.2, 0.3, 0.4])))
    })

    const createNodeData = (overrides: Record<string, any> = {}) => ({
        inputs: {
            qdrantServerUrl: 'http://localhost:6333',
            qdrantCollection: 'test-collection',
            embeddings: fakeEmbeddings,
            qdrantSimilarity: 'Cosine',
            qdrantVectorDimension: '1536',
            document: [new Document({ pageContent: 'hello world', metadata: { source: 'test-source' } })],
            ...overrides
        }
    })

    // Minimal recordManager stub — shape read off src/indexing.ts's index() function directly,
    // not guessed: createSchema (called by Qdrant.ts itself), getTime/exists/update/listKeys/deleteKeys
    // (called by index()).
    const createFakeRecordManager = () => ({
        createSchema: jest.fn().mockResolvedValue(undefined),
        getTime: jest.fn().mockResolvedValue(Date.now()),
        exists: jest.fn().mockImplementation(async (uids: string[]) => uids.map(() => false)),
        update: jest.fn().mockResolvedValue(undefined),
        listKeys: jest.fn().mockResolvedValue([]),
        deleteKeys: jest.fn().mockResolvedValue(undefined),
        namespace: 'test-namespace'
    })

    beforeEach(async () => {
        jest.clearAllMocks()

        const qdrantClientModule = require('@qdrant/js-client-rest')
        getCollectionsMock = qdrantClientModule.__getCollectionsMock
        createCollectionMock = qdrantClientModule.__createCollectionMock
        upsertMock = qdrantClientModule.__upsertMock
        collectionExistsMock = qdrantClientModule.__collectionExistsMock
        getCollectionMock = qdrantClientModule.__getCollectionMock
        updateCollectionMock = qdrantClientModule.__updateCollectionMock
        queryMock = qdrantClientModule.__queryMock

        // Default to "collection doesn't exist yet" so a test that forgets to override this
        // fails on a clear assertion mismatch instead of an unhelpful "Cannot read properties
        // of undefined (reading 'map')" inside ensureCollection().
        getCollectionsMock.mockReset().mockResolvedValue({ collections: [] })
        createCollectionMock.mockReset().mockResolvedValue({})
        upsertMock.mockReset().mockResolvedValue({})
        collectionExistsMock.mockReset().mockResolvedValue({ exists: false })
        getCollectionMock.mockReset().mockResolvedValue({ config: { params: { vectors: undefined, sparse_vectors: undefined } } })
        updateCollectionMock.mockReset().mockResolvedValue(true)
        queryMock.mockReset().mockResolvedValue({ points: [] })

        fakeEmbeddings = createFakeEmbeddings()

        // Dynamic import to load this file's `module.exports = { nodeClass }` CommonJS export
        // style (mirroring AWSDynamoDBKVStorage.test.ts). Note this does NOT get a fresh module
        // instance per test — there's no jest.resetModules() call, so it's the same cached
        // module every time; harmless since the module holds no mutable state between tests.
        const qdrantNodeModule = (await import('./Qdrant')) as any
        Qdrant_VectorStores = qdrantNodeModule.nodeClass
    })

    describe('determinePortByUrl (pure function, no mocking)', () => {
        it.each([
            ['http://10.0.0.1:6333', 6333],
            ['https://foo.com:8443', 8443],
            ['https://foo.com', 443],
            ['http://foo.com', 80],
            // The doc comment above determinePortByUrl describes a 6663 fallback for an edge case.
            // Empirically verified (not assumed from the comment): http/https URLs always resolve
            // to an explicit port, 443, or 80 — they never reach the 6663 branch. It IS reachable,
            // but only for a URL whose parsed protocol isn't "http:"/"https:": either a non-HTTP
            // scheme, or (surprisingly) a scheme-less input like "localhost:6333", which Node's URL
            // parser reads as protocol "localhost:" with an empty port — silently landing on 6663
            // despite the literal port number being present in the string.
            ['ftp://foo.com', 6663],
            ['localhost:6333', 6663]
        ])('determinePortByUrl(%s) returns %d', (url, expectedPort) => {
            expect(Qdrant_VectorStores.determinePortByUrl(url)).toBe(expectedPort)
        })
    })

    describe('init() — ensureCollection-triggered creation, Dense mode', () => {
        it('creates the collection, sized via the embedQuery("test") fallback, when it does not exist', async () => {
            getCollectionsMock.mockResolvedValue({ collections: [] })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData()

            await node.init(nodeData, '', {})

            // qdrantCollectionConfiguration input isn't set, so Qdrant.ts's init() never sets
            // dbConfig.collectionConfig — ensureCollection() falls back to sizing via embedQuery.
            expect(fakeEmbeddings.embedQuery).toHaveBeenCalledWith('test')
            expect(createCollectionMock).toHaveBeenCalledTimes(1)
            expect(createCollectionMock).toHaveBeenCalledWith('test-collection', {
                vectors: { size: 4, distance: 'Cosine' }
            })
        })

        it('does not create the collection when it already exists', async () => {
            getCollectionsMock.mockResolvedValue({ collections: [{ name: 'test-collection' }] })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData()

            await node.init(nodeData, '', {})

            expect(createCollectionMock).not.toHaveBeenCalled()
        })
    })

    describe('init() (query-only): never creates a missing collection in named-vector modes', () => {
        it.each(['Sparse', 'Hybrid'])('%s: collectionExists -> { exists: false } throws, createCollection never called', async (mode) => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: mode })
            nodeData.outputs = { output: 'vectorStore' }

            await expect(node.init(nodeData, '', {})).rejects.toThrow(/does not exist/)
            expect(createCollectionMock).not.toHaveBeenCalled()
        })

        it('Dense with vectorName set: collectionExists -> { exists: false } throws, createCollection never called', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Dense', vectorName: 'dense-vector' })
            nodeData.outputs = { output: 'vectorStore' }

            await expect(node.init(nodeData, '', {})).rejects.toThrow(/does not exist/)
            expect(createCollectionMock).not.toHaveBeenCalled()
        })
    })

    describe('upsert() without recordManager — ensureCollection-triggered creation, Dense mode', () => {
        it.each([
            ['collection does not exist', 1, [] as { name: string }[]],
            ['collection already exists', 0, [{ name: 'test-collection' }]]
        ])('%s -> createCollection called %d time(s)', async (_label, expectedCalls, collections) => {
            getCollectionsMock.mockResolvedValue({ collections })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData()

            await node.vectorStoreMethods.upsert(nodeData, {})

            // fromDocuments() -> base (unoverridden) addVectors() -> exactly one ensureCollection() call.
            expect(createCollectionMock).toHaveBeenCalledTimes(expectedCalls)
            if (expectedCalls > 0) {
                expect(createCollectionMock).toHaveBeenCalledWith('test-collection', {
                    vectors: { size: 1536, distance: 'Cosine' }
                })
            }
        })
    })

    describe('upsert() with recordManager — ensureCollection-triggered creation, Dense mode', () => {
        it.each([
            ['collection does not exist', 2, [] as { name: string }[]],
            ['collection already exists', 0, [{ name: 'test-collection' }]]
        ])('%s -> createCollection called %d time(s)', async (_label, expectedCalls, collections) => {
            getCollectionsMock.mockResolvedValue({ collections })

            const node = new Qdrant_VectorStores()
            const recordManager = createFakeRecordManager()
            const nodeData: any = createNodeData({ recordManager })

            await node.vectorStoreMethods.upsert(nodeData, {})

            // Qdrant.ts calls vectorStore.ensureCollection() explicitly before indexing, AND the
            // Flowise-overridden addVectors calls it again before every upsert batch — so with a
            // single batch this fires twice, not once, when the collection is missing.
            expect(createCollectionMock).toHaveBeenCalledTimes(expectedCalls)
            expect(recordManager.createSchema).toHaveBeenCalledTimes(1)
        })
    })

    // ---------------------------------------------------------------------------------------
    // Hybrid search (retrievalMode = Sparse / Hybrid)
    // ---------------------------------------------------------------------------------------

    describe('input schema — new fields', () => {
        it('bumps this.version to 6.0', () => {
            const node = new Qdrant_VectorStores()
            expect(node.version).toBe(6.0)
        })

        it('retrievalMode: top-level (not additionalParams), options Dense/Sparse/Hybrid, default Dense', () => {
            const node = new Qdrant_VectorStores()
            const field = node.inputs.find((i: any) => i.name === 'retrievalMode')

            expect(field).toBeDefined()
            expect(field.additionalParams).toBeFalsy()
            expect(field.default).toBe('Dense')
            expect(field.options.map((o: any) => o.name)).toEqual(['Dense', 'Sparse', 'Hybrid'])
        })

        it('vectorName: additionalParams, optional, string, shown only in Dense/Hybrid (unused in Sparse)', () => {
            const node = new Qdrant_VectorStores()
            const field = node.inputs.find((i: any) => i.name === 'vectorName')

            expect(field.additionalParams).toBe(true)
            expect(field.optional).toBe(true)
            expect(field.type).toBe('string')
            expect(field.show).toEqual({ retrievalMode: ['Dense', 'Hybrid'] })
        })

        it('sparseVectorName: additionalParams, default "sparse", visible only for Sparse/Hybrid', () => {
            const node = new Qdrant_VectorStores()
            const field = node.inputs.find((i: any) => i.name === 'sparseVectorName')

            expect(field.additionalParams).toBe(true)
            expect(field.default).toBe('sparse')
            expect(field.show).toEqual({ retrievalMode: ['Sparse', 'Hybrid'] })
        })

        it('sparseInferenceModel: additionalParams, fixed default "qdrant/bm25", visible only for Sparse/Hybrid', () => {
            const node = new Qdrant_VectorStores()
            const field = node.inputs.find((i: any) => i.name === 'sparseInferenceModel')

            expect(field.additionalParams).toBe(true)
            expect(field.default).toBe('qdrant/bm25')
            expect(field.show).toEqual({ retrievalMode: ['Sparse', 'Hybrid'] })
        })

        it('fusionMethod: additionalParams, options RRF/DBSF, default RRF, visible only for Hybrid', () => {
            const node = new Qdrant_VectorStores()
            const field = node.inputs.find((i: any) => i.name === 'fusionMethod')

            expect(field.additionalParams).toBe(true)
            expect(field.default).toBe('RRF')
            expect(field.options.map((o: any) => o.name)).toEqual(['RRF', 'DBSF'])
            expect(field.show).toEqual({ retrievalMode: ['Hybrid'] })
        })
    })

    describe('collection creation — ensureCollectionForRetrievalMode branches', () => {
        let client: any

        beforeEach(() => {
            const { QdrantClient } = require('@qdrant/js-client-rest')
            client = new QdrantClient({})
        })

        it('Sparse, new collection: sparse_vectors only, no dense "vectors" field at all', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                retrievalMode: 'Sparse',
                vectorSize: 1536,
                distance: 'Cosine',
                denseVectorName: 'dense',
                sparseVectorName: 'sparse',
                allowCreate: true
            })

            expect(createCollectionMock).toHaveBeenCalledWith('test-collection', {
                sparse_vectors: { sparse: { modifier: 'idf' } }
            })
        })

        it('Hybrid, new collection: named dense vector + sparse_vectors', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                retrievalMode: 'Hybrid',
                vectorSize: 1536,
                distance: 'Cosine',
                denseVectorName: 'dense',
                sparseVectorName: 'sparse',
                allowCreate: true
            })

            expect(createCollectionMock).toHaveBeenCalledWith('test-collection', {
                vectors: { dense: { size: 1536, distance: 'Cosine' } },
                sparse_vectors: { sparse: { modifier: 'idf' } }
            })
        })

        it('Hybrid, new collection with a custom vectorName: uses that name, not the "dense" default', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                retrievalMode: 'Hybrid',
                vectorSize: 1536,
                distance: 'Cosine',
                denseVectorName: 'my-embedding',
                sparseVectorName: 'sparse',
                allowCreate: true
            })

            expect(createCollectionMock).toHaveBeenCalledWith('test-collection', {
                vectors: { 'my-embedding': { size: 1536, distance: 'Cosine' } },
                sparse_vectors: { sparse: { modifier: 'idf' } }
            })
        })

        it('new collection: qdrantCollectionConfiguration passthrough is layered underneath the computed vectors/sparse_vectors', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                retrievalMode: 'Hybrid',
                vectorSize: 1536,
                distance: 'Cosine',
                denseVectorName: 'dense',
                sparseVectorName: 'sparse',
                allowCreate: true,
                extraCollectionConfig: { on_disk_payload: false }
            })

            expect(createCollectionMock).toHaveBeenCalledWith('test-collection', {
                on_disk_payload: false,
                vectors: { dense: { size: 1536, distance: 'Cosine' } },
                sparse_vectors: { sparse: { modifier: 'idf' } }
            })
        })

        it('allowCreate=false + collection does not exist -> throws, createCollection never called', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            await expect(
                Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                    retrievalMode: 'Sparse',
                    vectorSize: 1536,
                    distance: 'Cosine',
                    denseVectorName: 'dense',
                    sparseVectorName: 'sparse',
                    allowCreate: false
                })
            ).rejects.toThrow(/does not exist/)

            expect(createCollectionMock).not.toHaveBeenCalled()
        })

        it('Hybrid, existing collection with an unnamed dense vector: throws (unnamed vectors are not usable in named-vector modes), never mutates', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: { size: 1536, distance: 'Cosine' }, sparse_vectors: undefined } }
            })

            await expect(
                Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                    retrievalMode: 'Hybrid',
                    vectorSize: 1536,
                    distance: 'Cosine',
                    denseVectorName: 'dense',
                    sparseVectorName: 'sparse',
                    allowCreate: true
                })
            ).rejects.toThrow(/uses an unnamed dense vector/)

            expect(createCollectionMock).not.toHaveBeenCalled()
            expect(updateCollectionMock).not.toHaveBeenCalled()
            expect(queryMock).not.toHaveBeenCalled()
        })

        it('existing collection already has a matching named dense vector and matching sparse vector -> neither createCollection nor updateCollection called', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: {
                    params: {
                        vectors: { dense: { size: 1536, distance: 'Cosine' } },
                        sparse_vectors: { sparse: { modifier: 'idf' } }
                    }
                }
            })

            await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                retrievalMode: 'Hybrid',
                vectorSize: 1536,
                distance: 'Cosine',
                denseVectorName: 'dense',
                sparseVectorName: 'sparse',
                allowCreate: true
            })

            expect(createCollectionMock).not.toHaveBeenCalled()
            expect(updateCollectionMock).not.toHaveBeenCalled()
        })

        it('Hybrid, existing collection with a mismatched named dense vector size -> throws, never mutates', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: { dense: { size: 768, distance: 'Cosine' } }, sparse_vectors: {} } }
            })

            await expect(
                Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                    retrievalMode: 'Hybrid',
                    vectorSize: 1536,
                    distance: 'Cosine',
                    denseVectorName: 'dense',
                    sparseVectorName: 'sparse',
                    allowCreate: true
                })
            ).rejects.toThrow(/does not match the requested configuration/)

            expect(createCollectionMock).not.toHaveBeenCalled()
            expect(updateCollectionMock).not.toHaveBeenCalled()
        })

        it('Hybrid, existing collection with no dense vector at all -> throws, never mutates', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: undefined, sparse_vectors: { sparse: { modifier: 'idf' } } } }
            })

            await expect(
                Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                    retrievalMode: 'Hybrid',
                    vectorSize: 1536,
                    distance: 'Cosine',
                    denseVectorName: 'dense',
                    sparseVectorName: 'sparse',
                    allowCreate: true
                })
            ).rejects.toThrow(/has no dense vector configured/)

            expect(updateCollectionMock).not.toHaveBeenCalled()
        })

        it('missing sparse vector on an existing collection -> throws citing the qdrant/qdrant#8892 upstream gap, regardless of allowCreate', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: undefined, sparse_vectors: {} } }
            })

            let caught: Error | undefined
            try {
                await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                    retrievalMode: 'Sparse',
                    vectorSize: 1536,
                    distance: 'Cosine',
                    denseVectorName: 'dense',
                    sparseVectorName: 'sparse',
                    allowCreate: false
                })
            } catch (e: any) {
                caught = e
            }

            expect(caught?.message).toMatch(/has no sparse vector named "sparse"/)
            expect(caught?.message).toMatch(/qdrant\/qdrant#8892/)
            expect(updateCollectionMock).not.toHaveBeenCalled()
            expect(createCollectionMock).not.toHaveBeenCalled()
        })

        it('Dense, new collection: named dense vector only, no sparse_vectors field at all', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                retrievalMode: 'Dense',
                vectorSize: 1536,
                distance: 'Cosine',
                denseVectorName: 'dense-vector',
                sparseVectorName: 'sparse',
                allowCreate: true
            })

            expect(createCollectionMock).toHaveBeenCalledWith('test-collection', {
                vectors: { 'dense-vector': { size: 1536, distance: 'Cosine' } }
            })
        })

        it('Dense, existing collection with a matching named dense vector -> neither createCollection nor updateCollection called', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: { 'dense-vector': { size: 1536, distance: 'Cosine' } }, sparse_vectors: undefined } }
            })

            await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                retrievalMode: 'Dense',
                vectorSize: 1536,
                distance: 'Cosine',
                denseVectorName: 'dense-vector',
                sparseVectorName: 'sparse',
                allowCreate: false
            })

            expect(createCollectionMock).not.toHaveBeenCalled()
            expect(updateCollectionMock).not.toHaveBeenCalled()
        })

        it('Dense, existing collection missing the named dense vector -> throws, never mutates', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: { other: { size: 1536, distance: 'Cosine' } }, sparse_vectors: undefined } }
            })

            await expect(
                Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                    retrievalMode: 'Dense',
                    vectorSize: 1536,
                    distance: 'Cosine',
                    denseVectorName: 'dense-vector',
                    sparseVectorName: 'sparse',
                    allowCreate: false
                })
            ).rejects.toThrow(/has no dense vector named "dense-vector"/)

            expect(createCollectionMock).not.toHaveBeenCalled()
            expect(updateCollectionMock).not.toHaveBeenCalled()
        })

        it('Dense, existing collection with a mismatched named dense vector -> throws, never mutates', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: { 'dense-vector': { size: 768, distance: 'Cosine' } }, sparse_vectors: undefined } }
            })

            await expect(
                Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, 'test-collection', {
                    retrievalMode: 'Dense',
                    vectorSize: 1536,
                    distance: 'Cosine',
                    denseVectorName: 'dense-vector',
                    sparseVectorName: 'sparse',
                    allowCreate: false
                })
            ).rejects.toThrow(/does not match the requested configuration/)

            expect(createCollectionMock).not.toHaveBeenCalled()
            expect(updateCollectionMock).not.toHaveBeenCalled()
        })
    })

    describe('upsert() — Sparse/Hybrid wiring and point shape', () => {
        it('Hybrid, no recordManager: single collectionExists call (collapsed, not doubled like Dense), named dense + sparse Document point', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Hybrid' })

            await node.vectorStoreMethods.upsert(nodeData, {})

            expect(collectionExistsMock).toHaveBeenCalledTimes(1)
            expect(createCollectionMock).toHaveBeenCalledTimes(1)
            expect(upsertMock).toHaveBeenCalledWith('test-collection', {
                wait: true,
                points: [
                    expect.objectContaining({
                        vector: {
                            dense: [0.1, 0.2, 0.3, 0.4],
                            sparse: { text: 'hello world', model: 'qdrant/bm25' }
                        },
                        payload: {
                            content: 'hello world',
                            metadata: { source: 'test-source' },
                            customPayload: undefined
                        }
                    })
                ]
            })
        })

        it('Sparse, no recordManager: sparse-only vector field, no dense key, and never calls embedDocuments', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Sparse' })

            await node.vectorStoreMethods.upsert(nodeData, {})

            // Sparse has no dense component — building points directly from finalDocs must never
            // trigger an (unused, paid) dense embedding computation.
            expect(fakeEmbeddings.embedDocuments).not.toHaveBeenCalled()
            expect(upsertMock).toHaveBeenCalledWith('test-collection', {
                wait: true,
                points: [
                    expect.objectContaining({
                        vector: { sparse: { text: 'hello world', model: 'qdrant/bm25' } },
                        payload: {
                            content: 'hello world',
                            metadata: { source: 'test-source' },
                            customPayload: undefined
                        }
                    })
                ]
            })
        })

        it('Hybrid + recordManager: collectionExists call also collapsed to one (deliberate divergence from Dense’s double-call quirk)', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            const node = new Qdrant_VectorStores()
            const recordManager = createFakeRecordManager()
            const nodeData: any = createNodeData({ retrievalMode: 'Hybrid', recordManager })

            await node.vectorStoreMethods.upsert(nodeData, {})

            expect(collectionExistsMock).toHaveBeenCalledTimes(1)
            expect(createCollectionMock).toHaveBeenCalledTimes(1)
            expect(recordManager.createSchema).toHaveBeenCalledTimes(1)
        })

        it('missing sparse vector on an existing collection, from upsert(): throws instead of upgrading (no in-place upgrade path exists)', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: undefined, sparse_vectors: {} } }
            })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Sparse' })

            await expect(node.vectorStoreMethods.upsert(nodeData, {})).rejects.toThrow(/has no sparse vector named "sparse"/)
            expect(updateCollectionMock).not.toHaveBeenCalled()
            expect(createCollectionMock).not.toHaveBeenCalled()
            expect(upsertMock).not.toHaveBeenCalled()
        })

        it('batching: batchSize=1 with 2 documents through the named-vector path -> two separate upsert calls, correctly sliced', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({
                retrievalMode: 'Hybrid',
                batchSize: 1,
                document: [
                    new Document({ pageContent: 'doc one', metadata: { source: 'a' } }),
                    new Document({ pageContent: 'doc two', metadata: { source: 'b' } })
                ]
            })

            await node.vectorStoreMethods.upsert(nodeData, {})

            expect(upsertMock).toHaveBeenCalledTimes(2)
            expect(upsertMock).toHaveBeenNthCalledWith(1, 'test-collection', {
                wait: true,
                points: [
                    expect.objectContaining({
                        vector: { dense: [0.1, 0.2, 0.3, 0.4], sparse: { text: 'doc one', model: 'qdrant/bm25' } }
                    })
                ]
            })
            expect(upsertMock).toHaveBeenNthCalledWith(2, 'test-collection', {
                wait: true,
                points: [
                    expect.objectContaining({
                        vector: { dense: [0.1, 0.2, 0.3, 0.4], sparse: { text: 'doc two', model: 'qdrant/bm25' } }
                    })
                ]
            })
        })

        it('upsert(): sparseInferenceModel value other than qdrant/bm25 throws before any collection calls', async () => {
            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Sparse', sparseInferenceModel: 'some-other-model' })

            await expect(node.vectorStoreMethods.upsert(nodeData, {})).rejects.toThrow(
                /Sparse Inference Model "some-other-model" is not supported/
            )
            expect(collectionExistsMock).not.toHaveBeenCalled()
        })
    })

    describe('query building — client.query() call shape per mode', () => {
        it('Dense (regression, unchanged): plain vector query, using stays undefined', async () => {
            getCollectionsMock.mockResolvedValue({ collections: [{ name: 'test-collection' }] })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Dense' })
            nodeData.outputs = { output: 'vectorStore' }

            const vectorStore = await node.init(nodeData, '', {})
            await vectorStore.similaritySearchWithScore('hello world', 4)

            expect(queryMock).toHaveBeenCalledWith('test-collection', {
                query: [0.1, 0.2, 0.3, 0.4],
                limit: 4,
                filter: undefined,
                with_payload: ['metadata', 'content'],
                with_vector: false
            })
        })

        it('Sparse: sends the {text, model} Document shape, not a literal {indices, values} sparse vector', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: undefined, sparse_vectors: { sparse: { modifier: 'idf' } } } }
            })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Sparse' })
            nodeData.outputs = { output: 'vectorStore' }

            const vectorStore = await node.init(nodeData, '', {})
            await vectorStore.similaritySearchWithScore('hello world', 4)

            expect(queryMock).toHaveBeenCalledWith('test-collection', {
                query: { text: 'hello world', model: 'qdrant/bm25' },
                using: 'sparse',
                limit: 4,
                filter: undefined,
                with_payload: ['metadata', 'content'],
                with_vector: false
            })
            // Sparse mode must not need a dense embedding for the query itself.
            expect(fakeEmbeddings.embedQuery).not.toHaveBeenCalled()
        })

        it('sparseInferenceModel: a value other than qdrant/bm25 throws instead of being silently ignored', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: undefined, sparse_vectors: { sparse: { modifier: 'idf' } } } }
            })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Sparse', sparseInferenceModel: 'some-other-model' })
            nodeData.outputs = { output: 'vectorStore' }

            await expect(node.init(nodeData, '', {})).rejects.toThrow(/Sparse Inference Model "some-other-model" is not supported/)
            expect(collectionExistsMock).not.toHaveBeenCalled()
        })

        it.each([
            ['RRF', 'rrf'],
            ['DBSF', 'dbsf']
        ])('Hybrid (%s): prefetch dense + sparse, fused outer query', async (fusionInput, expectedFusion) => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: {
                    params: {
                        vectors: { dense: { size: 1536, distance: 'Cosine' } },
                        sparse_vectors: { sparse: { modifier: 'idf' } }
                    }
                }
            })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Hybrid', fusionMethod: fusionInput })
            nodeData.outputs = { output: 'vectorStore' }

            const vectorStore = await node.init(nodeData, '', {})
            await vectorStore.similaritySearchWithScore('hello world', 4)

            expect(queryMock).toHaveBeenCalledWith('test-collection', {
                prefetch: [
                    { using: 'dense', query: [0.1, 0.2, 0.3, 0.4], filter: undefined, limit: 4 },
                    { using: 'sparse', query: { text: 'hello world', model: 'qdrant/bm25' }, filter: undefined, limit: 4 }
                ],
                query: { fusion: expectedFusion },
                limit: 4,
                filter: undefined,
                with_payload: ['metadata', 'content'],
                with_vector: false
            })
        })
    })

    describe('response mapping — client.query() points map to Document[]', () => {
        it.each(['Dense', 'Sparse', 'Hybrid'])('%s: id/payload map to Document id/metadata/pageContent, score preserved', async (mode) => {
            if (mode === 'Dense') {
                getCollectionsMock.mockResolvedValue({ collections: [{ name: 'test-collection' }] })
            } else {
                collectionExistsMock.mockResolvedValue({ exists: true })
                getCollectionMock.mockResolvedValue({
                    config: {
                        params: {
                            vectors: mode === 'Hybrid' ? { dense: { size: 1536, distance: 'Cosine' } } : undefined,
                            sparse_vectors: { sparse: { modifier: 'idf' } }
                        }
                    }
                })
            }
            queryMock.mockResolvedValue({
                points: [{ id: 'point-1', score: 0.87, payload: { content: 'hello world', metadata: { source: 'test-source' } } }]
            })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: mode })
            nodeData.outputs = { output: 'vectorStore' }

            const vectorStore = await node.init(nodeData, '', {})
            const [[doc, score]] = await vectorStore.similaritySearchWithScore('hello world', 4)

            expect(doc.id).toBe('point-1')
            expect(doc.pageContent).toBe('hello world')
            expect(doc.metadata).toEqual({ source: 'test-source' })
            expect(score).toBe(0.87)
        })

        it('a point with no payload content key falls back to an empty string, not undefined', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: undefined, sparse_vectors: { sparse: { modifier: 'idf' } } } }
            })
            queryMock.mockResolvedValue({
                points: [{ id: 'point-1', score: 0.5, payload: { metadata: { source: 'test-source' } } }]
            })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Sparse' })
            nodeData.outputs = { output: 'vectorStore' }

            const vectorStore = await node.init(nodeData, '', {})
            const [[doc]] = await vectorStore.similaritySearchWithScore('hello world', 4)

            expect(doc.pageContent).toBe('')
        })
    })

    describe('error paths — missing sparse vector must never silently degrade to dense-only', () => {
        it('init() (query-only): existing collection with no matching sparse vector throws an actionable error citing qdrant/qdrant#8892', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: undefined, sparse_vectors: {} } }
            })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Sparse' })
            nodeData.outputs = { output: 'vectorStore' }

            let caught: Error | undefined
            try {
                await node.init(nodeData, '', {})
            } catch (e: any) {
                caught = e
            }

            expect(caught?.message).toMatch(/has no sparse vector named "sparse"/)
            expect(caught?.message).toMatch(/qdrant\/qdrant#8892/)
            expect(updateCollectionMock).not.toHaveBeenCalled()
        })

        it('init() (query-only), Hybrid: existing collection with no dense vector at all throws instead of silently querying dense-less', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: undefined, sparse_vectors: { sparse: { modifier: 'idf' } } } }
            })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Hybrid' })
            nodeData.outputs = { output: 'vectorStore' }

            await expect(node.init(nodeData, '', {})).rejects.toThrow(/has no dense vector configured/)
            expect(queryMock).not.toHaveBeenCalled()
        })
    })

    describe('retriever output — filter propagation (Sparse/Hybrid/named-Dense)', () => {
        it("asRetriever + fileUpload/chatId: the FLOWISE_CHATID should-clause reaches client.query's filter", async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: undefined, sparse_vectors: { sparse: { modifier: 'idf' } } } }
            })
            queryMock.mockResolvedValue({ points: [] })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Sparse', fileUpload: true })
            nodeData.outputs = { output: 'retriever' }

            const retriever = await node.init(nodeData, '', { chatId: 'chat-123' })
            await retriever.invoke('hello world')

            expect(queryMock).toHaveBeenCalledWith(
                'test-collection',
                expect.objectContaining({
                    filter: {
                        should: [
                            { key: 'metadata.flowise_chatId', match: { value: 'chat-123' } },
                            { is_empty: { key: 'metadata.flowise_chatId' } }
                        ]
                    }
                })
            )
        })

        it('asRetriever without fileUpload: no filter reaches client.query', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: undefined, sparse_vectors: { sparse: { modifier: 'idf' } } } }
            })
            queryMock.mockResolvedValue({ points: [] })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Sparse' })
            nodeData.outputs = { output: 'retriever' }

            const retriever = await node.init(nodeData, '', {})
            await retriever.invoke('hello world')

            expect(queryMock).toHaveBeenCalledWith('test-collection', expect.objectContaining({ filter: undefined }))
        })
    })

    // ---------------------------------------------------------------------------------------
    // Dense mode honoring "Dense Vector Name" (vectorName) when explicitly set
    // ---------------------------------------------------------------------------------------

    describe('Dense mode with vectorName set', () => {
        it('backward compatibility: vectorName left blank -> init() still goes through the unnamed-vector path (collectionExists never called)', async () => {
            getCollectionsMock.mockResolvedValue({ collections: [{ name: 'test-collection' }] })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Dense' })

            await node.init(nodeData, '', {})

            expect(collectionExistsMock).not.toHaveBeenCalled()
        })

        it('backward compatibility: vectorName left blank -> upsert() (both paths) still goes through the unnamed-vector path (collectionExists never called)', async () => {
            getCollectionsMock.mockResolvedValue({ collections: [{ name: 'test-collection' }] })

            const node = new Qdrant_VectorStores()

            await node.vectorStoreMethods.upsert(createNodeData({ retrievalMode: 'Dense' }), {})
            expect(collectionExistsMock).not.toHaveBeenCalled()

            const recordManager = createFakeRecordManager()
            await node.vectorStoreMethods.upsert(createNodeData({ retrievalMode: 'Dense', recordManager }), {})
            expect(collectionExistsMock).not.toHaveBeenCalled()
        })

        it('init(): collection exists with a matching named dense vector -> query uses using: vectorName, correct Document mapping', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: { 'dense-vector': { size: 1536, distance: 'Cosine' } }, sparse_vectors: undefined } }
            })
            queryMock.mockResolvedValue({
                points: [{ id: 'point-1', score: 0.9, payload: { content: 'hello world', metadata: { source: 'test-source' } } }]
            })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Dense', vectorName: 'dense-vector' })
            nodeData.outputs = { output: 'vectorStore' }

            const vectorStore = await node.init(nodeData, '', {})
            const [[doc, score]] = await vectorStore.similaritySearchWithScore('hello world', 4)

            expect(queryMock).toHaveBeenCalledWith('test-collection', {
                query: [0.1, 0.2, 0.3, 0.4],
                using: 'dense-vector',
                limit: 4,
                filter: undefined,
                with_payload: ['metadata', 'content'],
                with_vector: false
            })
            expect(doc.id).toBe('point-1')
            expect(doc.pageContent).toBe('hello world')
            expect(doc.metadata).toEqual({ source: 'test-source' })
            expect(score).toBe(0.9)
        })

        it('init(): collection exists but the named dense vector is missing/mismatched -> throws instead of silently querying the unnamed vector', async () => {
            collectionExistsMock.mockResolvedValue({ exists: true })
            getCollectionMock.mockResolvedValue({
                config: { params: { vectors: { other: { size: 1536, distance: 'Cosine' } }, sparse_vectors: undefined } }
            })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Dense', vectorName: 'dense-vector' })
            nodeData.outputs = { output: 'vectorStore' }

            await expect(node.init(nodeData, '', {})).rejects.toThrow(/has no dense vector named "dense-vector"/)
            expect(queryMock).not.toHaveBeenCalled()
        })

        it.each([
            ['non-recordManager', undefined],
            ['recordManager', 'recordManager']
        ])(
            'upsert() (%s): collection does not exist -> createCollection called with named vectors only, no sparse_vectors key',
            async (_label, recordManagerFlag) => {
                collectionExistsMock.mockResolvedValue({ exists: false })

                const node = new Qdrant_VectorStores()
                const overrides: Record<string, any> = { retrievalMode: 'Dense', vectorName: 'dense-vector' }
                if (recordManagerFlag) {
                    overrides.recordManager = createFakeRecordManager()
                }
                const nodeData: any = createNodeData(overrides)

                await node.vectorStoreMethods.upsert(nodeData, {})

                expect(createCollectionMock).toHaveBeenCalledWith('test-collection', {
                    vectors: { 'dense-vector': { size: 1536, distance: 'Cosine' } }
                })
                expect(createCollectionMock.mock.calls[0][1]).not.toHaveProperty('sparse_vectors')
            }
        )

        it('upsert(): points upserted with vector: { [vectorName]: embedding }, not the unnamed shape', async () => {
            collectionExistsMock.mockResolvedValue({ exists: false })

            const node = new Qdrant_VectorStores()
            const nodeData: any = createNodeData({ retrievalMode: 'Dense', vectorName: 'dense-vector' })

            await node.vectorStoreMethods.upsert(nodeData, {})

            expect(upsertMock).toHaveBeenCalledWith('test-collection', {
                wait: true,
                points: [
                    expect.objectContaining({
                        vector: { 'dense-vector': [0.1, 0.2, 0.3, 0.4] },
                        payload: {
                            content: 'hello world',
                            metadata: { source: 'test-source' },
                            customPayload: undefined
                        }
                    })
                ]
            })
        })
    })
})
