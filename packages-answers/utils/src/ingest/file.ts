import { EventVersionHandler } from './EventVersionHandler'
import { prisma } from '@db/client'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import embedVectors from '../pinecone/embedVectors'

export const indexText: EventVersionHandler<{
    source?: string
    title?: string
    url: string
    content: string
    organizationId: string
}> = {
    event: 'file/markdown.index',
    v: '1',
    handler: async ({ event }) => {
        console.time('indexText')
        const user = await prisma.user.findUnique({
            where: { id: event?.user?.id! },
            include: { currentOrganization: true }
        })

        if (!user?.id) throw new Error('No user found')

        const data = event.data
        const { content, source, url } = data
        let organizationId = user.organizationId

        if (user.role === 'superadmin' && data.organizationId) {
            organizationId = data.organizationId
        }

        if (!organizationId) throw new Error('No organizationId found')

        const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 3000 })

        const chunks = await textSplitter.createDocuments([content])

        const embeddedVectors = await embedVectors(
            organizationId,
            event,
            chunks.map(({ pageContent }, idx) => ({
                uid: `File_${idx}_${url}`,
                text: `${pageContent}`,
                metadata: {
                    url,
                    source: source ?? 'file',
                    text: pageContent
                }
            }))
        )
        return embeddedVectors
    }
}
