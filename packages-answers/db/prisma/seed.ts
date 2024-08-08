import { prisma } from '../src/client'

async function main() {
    const testUser = await prisma.user.upsert({
        where: { email: 'test@theanswer.ai' },
        update: {},
        create: {
            email: 'test@theanswer.ai',
            name: 'Test'
        }
    })
    const chatapp = await prisma.chatApp.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: 'Test Chat App',
            apiKey: '01031993',
            userId: testUser.id
        }
    })

    const testUserTwo = await prisma.user.upsert({
        where: { email: 'test2@theanswer.ai' },
        update: {},
        create: {
            email: 'test2@theanswer.ai',
            name: 'Test 2'
        }
    })
    const chatapp2 = await prisma.chatApp.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: 'Test Chat App 2',
            apiKey: '05031979',
            userId: testUserTwo.id
        }
    })
    const defaultSidekick = await prisma.sidekick.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            isGlobal: true,
            isSystem: true,
            tags: ['Default'],
            label: 'Default',
            aiModel: 'gpt-3.5-turbo',
            systemPromptTemplate: 'You are a friendly assistant',
            userPromptTemplate: 'Reply based on the context provided \n\nCONTEXT: {{context}}\n\n USER INPUT:{{userInput}}',
            contextStringRender: `{{result.text}}`,
            userId: testUser.id
        }
    })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
