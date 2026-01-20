import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'
import { ChatType } from '../../../src/Interface'
import { ChatFlow } from '../../../src/database/entities/ChatFlow'
import { ChatMessage } from '../../../src/database/entities/ChatMessage'
import { Organization } from '../../../src/enterprise/database/entities/organization.entity'
import { User, UserStatus } from '../../../src/enterprise/database/entities/user.entity'
import { Workspace } from '../../../src/enterprise/database/entities/workspace.entity'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

export function publicChatmessageRouteTest() {
    describe('Public Chat Message Route', () => {
        const route = '/api/v1/public-chatmessage'
        const testData = {
            chatflowIds: [] as string[],
            chatMessageIds: [] as string[],
            organizationId: '',
            userId: '',
            workspaceId: '',
            createdWorkspace: false
        }
        let publicChatflowId = ''
        let publicSessionId = ''
        let publicChatId = ''
        let defaultChatflowId = ''
        let defaultSessionId = ''
        let defaultChatId = ''
        let disabledChatflowId = ''
        let disabledSessionId = ''
        let privateChatflowId = ''
        let privateSessionId = ''
        let privateChatId = ''

        beforeAll(async () => {
            const appServer = getRunningExpressApp()
            const chatflowRepo = appServer.AppDataSource.getRepository(ChatFlow)
            const messageRepo = appServer.AppDataSource.getRepository(ChatMessage)
            const workspaceRows: Array<{ id: string }> = await appServer.AppDataSource.query('SELECT id FROM workspace LIMIT 1')
            if (!workspaceRows.length) {
                const userRepo = appServer.AppDataSource.getRepository(User)
                const organizationRepo = appServer.AppDataSource.getRepository(Organization)
                const workspaceRepo = appServer.AppDataSource.getRepository(Workspace)
                const userId = uuidv4()
                const organizationId = uuidv4()
                const workspaceId = uuidv4()
                const userEmail = `test-${userId}@example.com`

                await userRepo.save({
                    id: userId,
                    name: 'Test User',
                    email: userEmail,
                    status: UserStatus.ACTIVE,
                    createdBy: userId,
                    updatedBy: userId
                })
                await organizationRepo.save({
                    id: organizationId,
                    name: 'Test Organization',
                    createdBy: userId,
                    updatedBy: userId
                })
                await workspaceRepo.save({
                    id: workspaceId,
                    name: 'Test Workspace',
                    organizationId,
                    createdBy: userId,
                    updatedBy: userId
                })

                testData.createdWorkspace = true
                testData.organizationId = organizationId
                testData.userId = userId
                testData.workspaceId = workspaceId
            } else {
                testData.workspaceId = workspaceRows[0].id
            }

            publicChatflowId = uuidv4()
            publicSessionId = uuidv4()
            publicChatId = uuidv4()
            defaultChatflowId = uuidv4()
            defaultSessionId = uuidv4()
            defaultChatId = uuidv4()
            disabledChatflowId = uuidv4()
            disabledSessionId = uuidv4()
            privateChatflowId = uuidv4()
            privateSessionId = uuidv4()
            privateChatId = uuidv4()

            await chatflowRepo.save({
                id: publicChatflowId,
                name: 'Public Chat History Test',
                flowData: JSON.stringify({ nodes: [], edges: [] }),
                isPublic: true,
                chatbotConfig: JSON.stringify({ chatHistory: { enabled: true } }),
                workspaceId: testData.workspaceId
            })
            await chatflowRepo.save({
                id: defaultChatflowId,
                name: 'Public Chat History Default On',
                flowData: JSON.stringify({ nodes: [], edges: [] }),
                isPublic: true,
                chatbotConfig: JSON.stringify({}),
                workspaceId: testData.workspaceId
            })
            await chatflowRepo.save({
                id: disabledChatflowId,
                name: 'Public Chat History Disabled',
                flowData: JSON.stringify({ nodes: [], edges: [] }),
                isPublic: true,
                chatbotConfig: JSON.stringify({ chatHistory: { enabled: false } }),
                workspaceId: testData.workspaceId
            })
            await chatflowRepo.save({
                id: privateChatflowId,
                name: 'Private Chat History Allowed',
                flowData: JSON.stringify({ nodes: [], edges: [] }),
                isPublic: false,
                chatbotConfig: JSON.stringify({}),
                workspaceId: testData.workspaceId
            })
            testData.chatflowIds.push(publicChatflowId, defaultChatflowId, disabledChatflowId, privateChatflowId)

            const baseMessage = {
                chatflowid: publicChatflowId,
                chatType: ChatType.EXTERNAL,
                chatId: publicChatId,
                sessionId: publicSessionId
            }
            const userMessage = messageRepo.create({
                ...baseMessage,
                role: 'userMessage',
                content: 'hello',
                sourceDocuments: JSON.stringify([{ pageContent: 'doc1' }]),
                createdDate: new Date('2024-01-01T00:00:00.000Z')
            })
            const apiMessage = messageRepo.create({
                ...baseMessage,
                role: 'apiMessage',
                content: 'hi',
                createdDate: new Date('2024-01-01T00:00:01.000Z')
            })
            const internalMessage = messageRepo.create({
                chatflowid: publicChatflowId,
                chatType: ChatType.INTERNAL,
                chatId: publicChatId,
                sessionId: publicSessionId,
                role: 'apiMessage',
                content: 'internal',
                createdDate: new Date('2024-01-01T00:00:02.000Z')
            })
            const defaultUserMessage = messageRepo.create({
                chatflowid: defaultChatflowId,
                chatType: ChatType.EXTERNAL,
                chatId: defaultChatId,
                sessionId: defaultSessionId,
                role: 'userMessage',
                content: 'default history',
                createdDate: new Date('2024-01-02T00:00:00.000Z')
            })
            const privateUserMessage = messageRepo.create({
                chatflowid: privateChatflowId,
                chatType: ChatType.EXTERNAL,
                chatId: privateChatId,
                sessionId: privateSessionId,
                role: 'userMessage',
                content: 'private history',
                createdDate: new Date('2024-01-03T00:00:00.000Z')
            })
            const saved = await messageRepo.save([userMessage, apiMessage, internalMessage, defaultUserMessage, privateUserMessage])
            testData.chatMessageIds.push(...saved.map((message) => message.id))
        })

        afterAll(async () => {
            const appServer = getRunningExpressApp()
            const chatflowRepo = appServer.AppDataSource.getRepository(ChatFlow)
            const messageRepo = appServer.AppDataSource.getRepository(ChatMessage)
            const workspaceRepo = appServer.AppDataSource.getRepository(Workspace)
            const organizationRepo = appServer.AppDataSource.getRepository(Organization)
            const userRepo = appServer.AppDataSource.getRepository(User)

            if (testData.chatMessageIds.length) {
                await messageRepo.delete(testData.chatMessageIds)
            }
            if (testData.chatflowIds.length) {
                await chatflowRepo.delete(testData.chatflowIds)
            }
            if (testData.createdWorkspace) {
                if (testData.workspaceId) {
                    await workspaceRepo.delete(testData.workspaceId)
                }
                if (testData.organizationId) {
                    await organizationRepo.delete(testData.organizationId)
                }
                if (testData.userId) {
                    await userRepo.delete(testData.userId)
                }
            }
        })

        describe(`GET ${route}/:id without sessionId or chatId`, () => {
            it(`should return a ${StatusCodes.BAD_REQUEST} status`, async () => {
                await supertest(getRunningExpressApp().app)
                    .get(`${route}/${publicChatflowId}`)
                    .expect(StatusCodes.BAD_REQUEST)
            })
        })

        describe(`GET ${route}/:id when chat history is disabled`, () => {
            it(`should return a ${StatusCodes.FORBIDDEN} status`, async () => {
                await supertest(getRunningExpressApp().app)
                    .get(`${route}/${disabledChatflowId}?sessionId=${disabledSessionId}`)
                    .expect(StatusCodes.FORBIDDEN)
            })
        })

        describe(`GET ${route}/:id when chat history config is missing`, () => {
            it(`should return a ${StatusCodes.OK} status by default`, async () => {
                await supertest(getRunningExpressApp().app)
                    .get(`${route}/${defaultChatflowId}?sessionId=${defaultSessionId}`)
                    .expect(StatusCodes.OK)
                    .then((response) => {
                        const body = response.body
                        expect(Array.isArray(body)).toEqual(true)
                        expect(body).toHaveLength(1)
                        expect(body[0].content).toEqual('default history')
                    })
            })
        })

        describe(`GET ${route}/:id returns external chat history`, () => {
            it(`should return a ${StatusCodes.OK} status with parsed messages`, async () => {
                await supertest(getRunningExpressApp().app)
                    .get(`${route}/${publicChatflowId}?sessionId=${publicSessionId}`)
                    .expect(StatusCodes.OK)
                    .then((response) => {
                        const body = response.body
                        expect(Array.isArray(body)).toEqual(true)
                        expect(body).toHaveLength(2)
                        expect(body[0].content).toEqual('hello')
                        expect(body[1].content).toEqual('hi')
                        expect(Array.isArray(body[0].sourceDocuments)).toEqual(true)
                        expect(body[0].sourceDocuments[0].pageContent).toEqual('doc1')
                    })
            })
        })

        describe(`GET ${route}/:id when chatflow is not public`, () => {
            it(`should return a ${StatusCodes.OK} status by default`, async () => {
                await supertest(getRunningExpressApp().app)
                    .get(`${route}/${privateChatflowId}?sessionId=${privateSessionId}`)
                    .expect(StatusCodes.OK)
                    .then((response) => {
                        const body = response.body
                        expect(Array.isArray(body)).toEqual(true)
                        expect(body).toHaveLength(1)
                        expect(body[0].content).toEqual('private history')
                    })
            })
        })
    })
}
