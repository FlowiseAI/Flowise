import { inngest } from '../ingest/client'
import chunkArray from '../utilities/chunkArray'

import type { PineconeVector } from 'types'

const PINECONE_VECTORS_BATCH_SIZE = 100

const embedVectors = async (organizationId: string, event: any, vectors: PineconeVector[]) => {
    let outVectors: void[] = []

    if (vectors?.length && vectors?.every((x: any) => !!x)) {
        outVectors = await Promise.all(
            chunkArray(vectors, PINECONE_VECTORS_BATCH_SIZE).map((batchVectors, i) => {
                return inngest.send({
                    v: '1',
                    ts: new Date().valueOf(),
                    name: 'pinecone/vectors.upserted',
                    data: {
                        _page: i,
                        _total: vectors.length,
                        _batchSize: PINECONE_VECTORS_BATCH_SIZE,
                        vectors: batchVectors,
                        organizationId
                    },
                    user: event.user
                })
            })
        )
    }

    return outVectors
}

export default embedVectors
