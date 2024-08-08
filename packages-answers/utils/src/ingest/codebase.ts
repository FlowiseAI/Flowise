import { EventVersionHandler } from './EventVersionHandler'
import { prisma } from '@db/client'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import embedVectors from '../pinecone/embedVectors'

export const codebaseEmbeddings: EventVersionHandler<{
    repo: string
    text: string
    filePath: string
    organizationId?: string
    code?: string
}> = {
    event: 'codebase/repo.sync',
    v: '1',
    handler: async ({ event }) => {
        const source = 'codebase'
        const data = event.data
        const { text, repo, filePath, code } = data
        const url = `${repo}/${filePath}`

        await prisma.document.upsert({
            where: { url },
            create: {
                title: repo,
                url,
                content: text,
                metadata: {
                    url,
                    repo,
                    source,
                    text,
                    filePath,
                    code
                },
                source
            },
            update: {
                title: repo,
                url,
                content: text,
                metadata: {
                    url,
                    repo,
                    source,
                    text,
                    filePath,
                    code
                },
                source
            }
        })

        let organizationId: string | null = null
        if (event?.user) {
            const user = await prisma.user.findUnique({
                where: { id: event?.user?.id! },
                include: { currentOrganization: true }
            })

            if (!user?.id) throw new Error('No user found')

            organizationId = user.organizationId

            if (user.role === 'superadmin' && data.organizationId) {
                organizationId = data.organizationId
            }
        } else if (event?.organization) {
            const organization = await prisma.organization.findUnique({
                where: { id: event?.organization?.id! }
            })

            if (!organization?.id) throw new Error('No organization found')

            organizationId = organization.id
        }

        if (!organizationId) throw new Error('No organizationId found')

        const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 3000 })

        const chunks = await textSplitter.createDocuments([text || ''])

        const embeddedVectors = await embedVectors(
            organizationId,
            event,
            chunks.map(({ pageContent }, idx) => ({
                uid: `codebase_${idx}_${url}`,
                text: `${pageContent}`,
                metadata: {
                    url,
                    repo,
                    source,
                    text,
                    filePath,
                    code
                }
            }))
        )
        return embeddedVectors
    }
}
