import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { verifyChatflowAccess } from './chatflowAccess'

// --- Mocks ---

const mockGetChatflowById = jest.fn()
jest.mock('../services/chatflows', () => ({
    __esModule: true,
    default: { getChatflowById: (...args: any[]) => mockGetChatflowById(...args) }
}))

const mockReadWorkspaceUserByUserId = jest.fn()
jest.mock('../enterprise/services/workspace-user.service', () => ({
    WorkspaceUserService: jest.fn().mockImplementation(() => ({
        readWorkspaceUserByUserId: (...args: any[]) => mockReadWorkspaceUserByUserId(...args)
    }))
}))

const mockRelease = jest.fn()
jest.mock('./getRunningExpressApp', () => ({
    getRunningExpressApp: () => ({
        AppDataSource: {
            createQueryRunner: () => ({ release: mockRelease })
        }
    })
}))

// --- Helpers ---

const makeChatflow = (overrides: object = {}) => ({
    id: 'chatflow-123',
    workspaceId: 'workspace-abc',
    isPublic: false,
    ...overrides
})

const makeUser = (overrides: object = {}) => ({ id: 'user-xyz', ...overrides })

// --- Tests ---

describe('verifyChatflowAccess', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('resolves without error for a public chatflow (no user required)', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow({ isPublic: true }))

        await expect(verifyChatflowAccess('chatflow-123', undefined)).resolves.toBeUndefined()

        // Should not touch workspace service for public chatflows
        expect(mockReadWorkspaceUserByUserId).not.toHaveBeenCalled()
    })

    it('propagates error when chatflow is not found', async () => {
        const notFoundError = new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow not found')
        mockGetChatflowById.mockRejectedValue(notFoundError)

        await expect(verifyChatflowAccess('missing-id', undefined)).rejects.toThrow(notFoundError)
    })

    it('throws UNAUTHORIZED for a private chatflow when no user is provided', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow({ isPublic: false }))

        const error = await verifyChatflowAccess('chatflow-123', undefined).catch((e) => e)

        expect(error).toBeInstanceOf(InternalFlowiseError)
        expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })

    it('resolves for a private chatflow when the user belongs to the chatflow workspace', async () => {
        const chatflow = makeChatflow({ workspaceId: 'workspace-abc' })
        mockGetChatflowById.mockResolvedValue(chatflow)
        mockReadWorkspaceUserByUserId.mockResolvedValue([{ workspaceId: 'workspace-abc' }, { workspaceId: 'workspace-other' }])

        await expect(verifyChatflowAccess('chatflow-123', makeUser())).resolves.toBeUndefined()
    })

    it('throws FORBIDDEN for a private chatflow when the user is in a different workspace', async () => {
        const chatflow = makeChatflow({ workspaceId: 'workspace-abc' })
        mockGetChatflowById.mockResolvedValue(chatflow)
        mockReadWorkspaceUserByUserId.mockResolvedValue([{ workspaceId: 'workspace-other' }])

        const error = await verifyChatflowAccess('chatflow-123', makeUser()).catch((e) => e)

        expect(error).toBeInstanceOf(InternalFlowiseError)
        expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
    })

    it('always releases the queryRunner even when workspace check throws', async () => {
        mockGetChatflowById.mockResolvedValue(makeChatflow({ isPublic: false }))
        mockReadWorkspaceUserByUserId.mockRejectedValue(new Error('DB error'))

        await expect(verifyChatflowAccess('chatflow-123', makeUser())).rejects.toThrow('DB error')

        expect(mockRelease).toHaveBeenCalledTimes(1)
    })

    it('always releases the queryRunner on a successful check', async () => {
        const chatflow = makeChatflow({ workspaceId: 'workspace-abc' })
        mockGetChatflowById.mockResolvedValue(chatflow)
        mockReadWorkspaceUserByUserId.mockResolvedValue([{ workspaceId: 'workspace-abc' }])

        await verifyChatflowAccess('chatflow-123', makeUser())

        expect(mockRelease).toHaveBeenCalledTimes(1)
    })
})
