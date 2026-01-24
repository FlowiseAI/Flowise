import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'
import { ChatFlow } from '../../../src/database/entities/ChatFlow'
import { Organization } from '../../../src/enterprise/database/entities/organization.entity'
import { User, UserStatus } from '../../../src/enterprise/database/entities/user.entity'
import { Workspace } from '../../../src/enterprise/database/entities/workspace.entity'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

export function predictionsRouteTest() {
    describe('Predictions Route', () => {
        const route = '/api/v1/prediction'
        const testData = {
            chatflowIds: [] as string[],
            organizationId: '',
            userId: '',
            workspaceId: '',
            createdWorkspace: false
        }
        let asyncChatflowId = ''

        beforeAll(async () => {
            const appServer = getRunningExpressApp()
            const chatflowRepo = appServer.AppDataSource.getRepository(ChatFlow)
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

            asyncChatflowId = uuidv4()
            await chatflowRepo.save({
                id: asyncChatflowId,
                name: 'Async Prediction Test',
                flowData: JSON.stringify({ nodes: [], edges: [] }),
                isPublic: true,
                chatbotConfig: JSON.stringify({}),
                workspaceId: testData.workspaceId
            })
            testData.chatflowIds.push(asyncChatflowId)
        })

        afterAll(async () => {
            const appServer = getRunningExpressApp()
            const chatflowRepo = appServer.AppDataSource.getRepository(ChatFlow)
            const workspaceRepo = appServer.AppDataSource.getRepository(Workspace)
            const organizationRepo = appServer.AppDataSource.getRepository(Organization)
            const userRepo = appServer.AppDataSource.getRepository(User)

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

        describe(`POST ${route}/:id with async enabled`, () => {
            it(`should return ${StatusCodes.ACCEPTED} with a chatId`, async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`${route}/${asyncChatflowId}`)
                    .send({ question: 'Hello async', async: true })
                    .expect(StatusCodes.ACCEPTED)

                expect(response.body.chatId).toBeTruthy()
                expect(response.body.sessionId).toBe(response.body.chatId)
                expect(response.body.status).toBe('accepted')
            })
        })
    })
}
