/**
 * Unit tests for MCP server service (packages/server/src/services/mcp-server/index.ts)
 *
 * These tests mock the database layer (getRunningExpressApp) and test the
 * service functions in isolation: config CRUD, token generation/verification,
 * toolName validation, and parseMcpConfig.
 */
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

// Mock typeorm decorators before any entity import (virtual: true for pnpm resolution)
jest.mock(
    'typeorm',
    () => ({
        Entity: () => (_target: any) => _target,
        Column: () => () => {},
        CreateDateColumn: () => () => {},
        UpdateDateColumn: () => () => {},
        PrimaryGeneratedColumn: () => () => {}
    }),
    { virtual: true }
)

// --- Mock setup ---
const mockFindOne = jest.fn()
const mockSave = jest.fn()

jest.mock('../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: () => ({
        AppDataSource: {
            getRepository: () => ({
                findOne: mockFindOne,
                save: mockSave
            })
        }
    })
}))

// Import after mocking
import mcpServerService from '.'
import { IMcpServerConfig } from '../../Interface'

// Helper: create a mock ChatFlow entity
function makeChatflow(overrides: Record<string, any> = {}) {
    return {
        id: 'chatflow-1',
        name: 'Test Chatflow',
        flowData: '{}',
        type: 'CHATFLOW',
        workspaceId: 'ws-1',
        mcpServerConfig: undefined as string | undefined,
        ...overrides
    }
}

function makeConfig(overrides: Partial<IMcpServerConfig> = {}): IMcpServerConfig {
    return {
        enabled: true,
        token: 'a'.repeat(32),
        description: 'Test tool',
        toolName: 'test_tool',
        ...overrides
    }
}

beforeEach(() => {
    jest.clearAllMocks()
    mockSave.mockImplementation((entity: any) => Promise.resolve(entity))
})

describe('mcpServerService', () => {
    describe('parseMcpConfig', () => {
        it('returns null when mcpServerConfig is undefined', () => {
            const chatflow = makeChatflow()
            expect(mcpServerService.parseMcpConfig(chatflow as any)).toBeNull()
        })

        it('returns null when mcpServerConfig is empty string', () => {
            const chatflow = makeChatflow({ mcpServerConfig: '' })
            expect(mcpServerService.parseMcpConfig(chatflow as any)).toBeNull()
        })

        it('parses valid JSON config', () => {
            const config = makeConfig()
            const chatflow = makeChatflow({ mcpServerConfig: JSON.stringify(config) })
            expect(mcpServerService.parseMcpConfig(chatflow as any)).toEqual(config)
        })

        it('returns null for invalid JSON', () => {
            const chatflow = makeChatflow({ mcpServerConfig: '{bad json' })
            expect(mcpServerService.parseMcpConfig(chatflow as any)).toBeNull()
        })
    })

    describe('getMcpServerConfig', () => {
        it('returns config when chatflow exists and has config', async () => {
            const config = makeConfig()
            mockFindOne.mockResolvedValue(makeChatflow({ mcpServerConfig: JSON.stringify(config) }))

            const result = await mcpServerService.getMcpServerConfig('chatflow-1', 'ws-1')
            expect(result).toEqual(config)
        })

        it('returns disabled config when chatflow has no config', async () => {
            mockFindOne.mockResolvedValue(makeChatflow())
            const result = await mcpServerService.getMcpServerConfig('chatflow-1', 'ws-1')
            expect(result).toEqual({ enabled: false, token: '', description: '', toolName: '' })
        })

        it('throws NOT_FOUND when chatflow does not exist', async () => {
            mockFindOne.mockResolvedValue(null)
            await expect(mcpServerService.getMcpServerConfig('no-such', 'ws-1')).rejects.toThrow(InternalFlowiseError)
            await expect(mcpServerService.getMcpServerConfig('no-such', 'ws-1')).rejects.toMatchObject({
                statusCode: StatusCodes.NOT_FOUND
            })
        })
    })

    describe('createMcpServerConfig', () => {
        it('creates a new config with generated token', async () => {
            mockFindOne.mockResolvedValue(makeChatflow())

            const result = await mcpServerService.createMcpServerConfig('chatflow-1', 'ws-1', {
                description: 'My tool',
                toolName: 'my_tool'
            })

            expect(result.enabled).toBe(true)
            expect(result.token).toHaveLength(32) // 16 bytes hex = 32 chars
            expect(result.description).toBe('My tool')
            expect(result.toolName).toBe('my_tool')
            expect(mockSave).toHaveBeenCalled()
        })

        it('returns existing config if already enabled', async () => {
            const existing = makeConfig()
            mockFindOne.mockResolvedValue(makeChatflow({ mcpServerConfig: JSON.stringify(existing) }))

            const result = await mcpServerService.createMcpServerConfig('chatflow-1', 'ws-1', {} as any)
            expect(result).toEqual(existing)
            expect(mockSave).not.toHaveBeenCalled()
        })

        it('throws NOT_FOUND when chatflow does not exist', async () => {
            mockFindOne.mockResolvedValue(null)
            await expect(mcpServerService.createMcpServerConfig('no-such', 'ws-1', {} as any)).rejects.toMatchObject({
                statusCode: StatusCodes.NOT_FOUND
            })
        })

        it('rejects invalid toolName', async () => {
            mockFindOne.mockResolvedValue(makeChatflow())
            await expect(
                mcpServerService.createMcpServerConfig('chatflow-1', 'ws-1', { toolName: 'invalid name with spaces!', description: 'desc' })
            ).rejects.toMatchObject({
                statusCode: StatusCodes.BAD_REQUEST
            })
        })

        it('accepts valid toolName patterns', async () => {
            mockFindOne.mockResolvedValue(makeChatflow())
            const result = await mcpServerService.createMcpServerConfig('chatflow-1', 'ws-1', {
                toolName: 'valid-tool_name123',
                description: 'A valid tool'
            })
            expect(result.toolName).toBe('valid-tool_name123')
        })

        it('rejects missing toolName', async () => {
            mockFindOne.mockResolvedValue(makeChatflow())
            await expect(
                mcpServerService.createMcpServerConfig('chatflow-1', 'ws-1', { description: 'desc' } as any)
            ).rejects.toMatchObject({
                statusCode: StatusCodes.BAD_REQUEST
            })
        })

        it('rejects missing description', async () => {
            mockFindOne.mockResolvedValue(makeChatflow())
            await expect(
                mcpServerService.createMcpServerConfig('chatflow-1', 'ws-1', { toolName: 'my_tool' } as any)
            ).rejects.toMatchObject({
                statusCode: StatusCodes.BAD_REQUEST
            })
        })
    })

    describe('updateMcpServerConfig', () => {
        it('updates description and toolName', async () => {
            const existing = makeConfig()
            mockFindOne.mockResolvedValue(makeChatflow({ mcpServerConfig: JSON.stringify(existing) }))

            const result = await mcpServerService.updateMcpServerConfig('chatflow-1', 'ws-1', {
                description: 'Updated desc',
                toolName: 'new_name'
            })

            expect(result.description).toBe('Updated desc')
            expect(result.toolName).toBe('new_name')
            expect(mockSave).toHaveBeenCalled()
        })

        it('can disable config via enabled=false', async () => {
            const existing = makeConfig()
            mockFindOne.mockResolvedValue(makeChatflow({ mcpServerConfig: JSON.stringify(existing) }))

            const result = await mcpServerService.updateMcpServerConfig('chatflow-1', 'ws-1', { enabled: false })
            expect(result.enabled).toBe(false)
        })

        it('throws NOT_FOUND when no existing config', async () => {
            mockFindOne.mockResolvedValue(makeChatflow())
            await expect(mcpServerService.updateMcpServerConfig('chatflow-1', 'ws-1', {})).rejects.toMatchObject({
                statusCode: StatusCodes.NOT_FOUND
            })
        })

        it('rejects invalid toolName on update', async () => {
            const existing = makeConfig()
            mockFindOne.mockResolvedValue(makeChatflow({ mcpServerConfig: JSON.stringify(existing) }))

            await expect(mcpServerService.updateMcpServerConfig('chatflow-1', 'ws-1', { toolName: 'a'.repeat(65) })).rejects.toMatchObject({
                statusCode: StatusCodes.BAD_REQUEST
            })
        })
    })

    describe('deleteMcpServerConfig', () => {
        it('sets enabled=false (soft delete)', async () => {
            const existing = makeConfig()
            mockFindOne.mockResolvedValue(makeChatflow({ mcpServerConfig: JSON.stringify(existing) }))

            await mcpServerService.deleteMcpServerConfig('chatflow-1', 'ws-1')

            expect(mockSave).toHaveBeenCalled()
            const savedEntity = mockSave.mock.calls[0][0]
            const savedConfig = JSON.parse(savedEntity.mcpServerConfig)
            expect(savedConfig.enabled).toBe(false)
            // Token should be preserved
            expect(savedConfig.token).toBe(existing.token)
        })

        it('does nothing when no config exists', async () => {
            mockFindOne.mockResolvedValue(makeChatflow())
            await mcpServerService.deleteMcpServerConfig('chatflow-1', 'ws-1')
            expect(mockSave).not.toHaveBeenCalled()
        })

        it('throws NOT_FOUND when chatflow does not exist', async () => {
            mockFindOne.mockResolvedValue(null)
            await expect(mcpServerService.deleteMcpServerConfig('no-such', 'ws-1')).rejects.toMatchObject({
                statusCode: StatusCodes.NOT_FOUND
            })
        })
    })

    describe('refreshMcpToken', () => {
        it('generates a new token', async () => {
            const existing = makeConfig({ token: 'old-token-value-1234567890ab' })
            mockFindOne.mockResolvedValue(makeChatflow({ mcpServerConfig: JSON.stringify(existing) }))

            const result = await mcpServerService.refreshMcpToken('chatflow-1', 'ws-1')

            expect(result.token).not.toBe('old-token-value-1234567890ab')
            expect(result.token).toHaveLength(32)
            expect(result.enabled).toBe(true)
            expect(mockSave).toHaveBeenCalled()
        })

        it('throws NOT_FOUND when no config exists', async () => {
            mockFindOne.mockResolvedValue(makeChatflow())
            await expect(mcpServerService.refreshMcpToken('chatflow-1', 'ws-1')).rejects.toMatchObject({
                statusCode: StatusCodes.NOT_FOUND
            })
        })

        it('throws NOT_FOUND when chatflow does not exist', async () => {
            mockFindOne.mockResolvedValue(null)
            await expect(mcpServerService.refreshMcpToken('no-such', 'ws-1')).rejects.toMatchObject({
                statusCode: StatusCodes.NOT_FOUND
            })
        })
    })

    describe('getChatflowByIdAndVerifyToken', () => {
        it('returns chatflow when token matches', async () => {
            const token = 'abcdef1234567890abcdef1234567890'
            const config = makeConfig({ token })
            const chatflow = makeChatflow({ mcpServerConfig: JSON.stringify(config) })
            mockFindOne.mockResolvedValue(chatflow)

            const result = await mcpServerService.getChatflowByIdAndVerifyToken('chatflow-1', token)
            expect(result.id).toBe('chatflow-1')
        })

        it('throws UNAUTHORIZED when token does not match', async () => {
            const config = makeConfig({ token: 'correct-token-00001234567890ab' })
            mockFindOne.mockResolvedValue(makeChatflow({ mcpServerConfig: JSON.stringify(config) }))

            await expect(
                mcpServerService.getChatflowByIdAndVerifyToken('chatflow-1', 'wrong-token-000001234567890ab')
            ).rejects.toMatchObject({
                statusCode: StatusCodes.UNAUTHORIZED
            })
        })

        it('throws NOT_FOUND when chatflow does not exist', async () => {
            mockFindOne.mockResolvedValue(null)
            await expect(mcpServerService.getChatflowByIdAndVerifyToken('no-such', 'token')).rejects.toMatchObject({
                statusCode: StatusCodes.NOT_FOUND
            })
        })

        it('throws NOT_FOUND when config is disabled', async () => {
            const config = makeConfig({ enabled: false })
            mockFindOne.mockResolvedValue(makeChatflow({ mcpServerConfig: JSON.stringify(config) }))

            await expect(mcpServerService.getChatflowByIdAndVerifyToken('chatflow-1', config.token)).rejects.toMatchObject({
                statusCode: StatusCodes.NOT_FOUND
            })
        })

        it('throws NOT_FOUND when config has no token', async () => {
            const config = { enabled: true, token: '' }
            mockFindOne.mockResolvedValue(makeChatflow({ mcpServerConfig: JSON.stringify(config) }))

            await expect(mcpServerService.getChatflowByIdAndVerifyToken('chatflow-1', 'some-token')).rejects.toMatchObject({
                statusCode: StatusCodes.NOT_FOUND
            })
        })
    })
})
