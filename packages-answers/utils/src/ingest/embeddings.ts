import PineconeClient from '../pinecone/client'
import { EventVersionHandler } from './EventVersionHandler'
import { PineconeVector } from 'types'
import { prisma } from '@db/client'
import OpenAI from '../openai/openai'
const openAi = new OpenAI()

const pinecone = new PineconeClient({
    namespace: process.env.PINECONE_INDEX_NAMESPACE,
    indexName: process.env.PINECONE_INDEX
})

const DISABLE_EMBEDDING = false

export const processVectorsUpserted: EventVersionHandler<{
    vectors: PineconeVector[]
    organizationId: string
}> = {
    event: 'pinecone/vectors.upserted',
    v: '1',
    handler: async ({ event }) => {
        const user = event.user
        const { vectors, organizationId } = event.data
        // console.log(vectors);
        if (!user) throw new Error('No user found')
        // TODO: Extract all the parentIDs from the new vectors
        // TODO: Fetch all the vectors with  parentIDs from pinecoone

        const vectorData = await Promise.all(
            vectors?.map((vector) =>
                openAi.createEmbedding({ user: user, input: vector.text }).then((embedding) => ({
                    id: vector.uid,
                    metadata: { ...vector.metadata, text: vector.text, organizationId },
                    values: embedding
                }))
            )
        )

        if (!DISABLE_EMBEDDING) await pinecone.writeVectorsToIndex(vectorData, organizationId)

        const documentUrls = vectors?.map((vector) => vector.metadata?.url ?? vector.metadata?.documentId)
        return await prisma.$transaction(async (tx) => {
            // await tx.document.createMany({
            //   data: normalizedUrls.map((url) => ({
            //     url,
            //     domain: getUrlDomain(url),
            //     source: 'web',
            //     status: 'pending',
            //     lastSyncedAt: null
            //   })),
            //   skipDuplicates: true
            // });
            const documents = await tx.document.findMany({
                where: {
                    url: { in: documentUrls }
                }
            })

            await Promise.all(
                documents
                    ?.filter((d) => d.source !== 'web')
                    ?.map((document) =>
                        tx.documentPermission.upsert({
                            where: { id: document.id },
                            update: {
                                organization: { connect: { id: organizationId! } }
                            },
                            create: {
                                document: { connect: { id: document.id } },
                                organization: { connect: { id: organizationId! } }
                            }
                        })
                    )
            )
            await tx.document.updateMany({
                where: {
                    url: { in: documentUrls }
                },
                data: {
                    status: 'synced',
                    lastSyncedAt: new Date()
                }
            })
        })
    }
}
