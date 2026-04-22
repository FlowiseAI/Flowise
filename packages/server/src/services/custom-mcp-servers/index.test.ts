import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { FLOWISE_COUNTER_STATUS, FLOWISE_METRIC_COUNTERS } from '../../Interface.Metrics'

// typeorm is not directly resolvable under pnpm strict hoisting; provide a
// virtual mock so entity decorators are no-ops in this test context.
jest.mock(
    'typeorm',
    () => {
        const noop = () => (_target: any, _key?: any) => {}
        return {
            Entity: () => noop(),
            Column: () => noop(),
            PrimaryGeneratedColumn: () => noop(),
            CreateDateColumn: () => noop(),
            UpdateDateColumn: () => noop(),
            ManyToOne: () => noop(),
            OneToMany: () => noop(),
            JoinColumn: () => noop(),
            Index: () => noop(),
            Unique: () => noop()
        }
    },
    { virtual: true }
)

// Import after the virtual mock is registered
import { CustomMcpServerStatus } from '../../Interface'

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockSave = jest.fn()
const mockCreate = jest.fn()
const mockDelete = jest.fn()
const mockFindOneBy = jest.fn()
const mockMerge = jest.fn()
const mockGetManyAndCount = jest.fn()
const mockGetOne = jest.fn()
const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getManyAndCount: mockGetManyAndCount,
    getOne: mockGetOne
}
const mockGetRepository = jest.fn().mockReturnValue({
    save: mockSave,
    create: mockCreate,
    delete: mockDelete,
    findOneBy: mockFindOneBy,
    merge: mockMerge,
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder)
})

const mockSendTelemetry = jest.fn()
const mockIncrementCounter = jest.fn()

jest.mock('../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn(() => ({
        AppDataSource: { getRepository: mockGetRepository },
        telemetry: { sendTelemetry: mockSendTelemetry },
        metricsProvider: { incrementCounter: mockIncrementCounter }
    }))
}))

jest.mock('../../utils', () => ({
    encryptCredentialData: jest.fn((data: any) => Promise.resolve(`encrypted:${JSON.stringify(data)}`)),
    decryptCredentialData: jest.fn((data: string) => {
        if (data.startsWith('encrypted:')) return Promise.resolve(JSON.parse(data.slice('encrypted:'.length)))
        return Promise.resolve(data)
    }),
    getAppVersion: jest.fn(() => Promise.resolve('1.0.0'))
}))

const mockInitialize = jest.fn()
const mockClose = jest.fn()
const mockCheckDenyList = jest.fn().mockResolvedValue(undefined)
const mockValidateCustomHeaders = jest.fn()
const mockToolkitImpl = jest.fn().mockImplementation(() => ({
    initialize: mockInitialize,
    _tools: { tools: [{ name: 'tool1' }] },
    client: { close: mockClose }
}))
jest.mock('flowise-components', () => ({
    MCPToolkit: mockToolkitImpl,
    checkDenyList: (url: string) => mockCheckDenyList(url),
    isValidURL: (url: string) => {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    },
    validateCustomHeaders: (headers: Record<string, string>) => mockValidateCustomHeaders(headers)
}))

jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

import customMcpServersService from './index'
import { encryptCredentialData, decryptCredentialData } from '../../utils'
import { MCPToolkit } from 'flowise-components'

const mockEncrypt = encryptCredentialData as jest.Mock
const mockDecrypt = decryptCredentialData as jest.Mock

// ── Helpers ─────────────────────────────────────────────────────────────────

const makeRecord = (overrides: Record<string, any> = {}) => ({
    id: 'mcp-1',
    name: 'Test Server',
    serverUrl: 'https://api.example.com/mcp/token123',
    iconSrc: null,
    color: null,
    authType: 'NONE',
    authConfig: null,
    tools: null,
    toolCount: 0,
    status: 'PENDING',
    enabled: true,
    createdDate: new Date('2025-01-01'),
    updatedDate: new Date('2025-01-01'),
    workspaceId: 'ws-1',
    ...overrides
})

// ── Tests ───────────────────────────────────────────────────────────────────

describe('customMcpServersService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockCreate.mockImplementation((entity: any) => entity)
    })

    // ── createCustomMcpServer ───────────────────────────────────────────

    describe('createCustomMcpServer', () => {
        it('should create a record and return db response', async () => {
            const saved = makeRecord()
            mockSave.mockResolvedValue(saved)

            const result = await customMcpServersService.createCustomMcpServer(
                { name: 'Test Server', serverUrl: 'https://api.example.com' },
                'org-1'
            )

            expect(mockSave).toHaveBeenCalled()
            expect(mockSendTelemetry).toHaveBeenCalledWith(
                'custom_mcp_server_created',
                expect.objectContaining({ version: '1.0.0', toolId: 'mcp-1', toolName: 'Test Server' }),
                'org-1'
            )
            expect(mockIncrementCounter).toHaveBeenCalledWith(FLOWISE_METRIC_COUNTERS.CUSTOM_MCP_SERVER_CREATED, {
                status: FLOWISE_COUNTER_STATUS.SUCCESS
            })
            // createCustomMcpServer returns a sanitized response: serverUrl is masked and authConfig is stripped
            const { authConfig: _authConfig, ...savedWithoutAuthConfig } = saved
            expect(result).toEqual({ ...savedWithoutAuthConfig, serverUrl: 'https://api.example.com/************' })
        })

        it('should encrypt authConfig when it is an object', async () => {
            const saved = makeRecord()
            mockSave.mockResolvedValue(saved)

            await customMcpServersService.createCustomMcpServer(
                { name: 'Test', serverUrl: 'https://example.com', authConfig: { headers: { 'X-Key': 'secret' } } },
                'org-1'
            )

            expect(mockEncrypt).toHaveBeenCalledWith({ headers: { 'X-Key': 'secret' } })
        })

        it('should not encrypt authConfig when it is not an object', async () => {
            const saved = makeRecord()
            mockSave.mockResolvedValue(saved)

            await customMcpServersService.createCustomMcpServer(
                { name: 'Test', serverUrl: 'https://example.com', authConfig: null },
                'org-1'
            )

            expect(mockEncrypt).not.toHaveBeenCalled()
        })

        it('should validate serverUrl and throw for invalid URL', async () => {
            await expect(customMcpServersService.createCustomMcpServer({ name: 'Bad', serverUrl: 'not-a-url' }, 'org-1')).rejects.toThrow(
                InternalFlowiseError
            )

            await expect(customMcpServersService.createCustomMcpServer({ name: 'Bad', serverUrl: 'not-a-url' }, 'org-1')).rejects.toThrow(
                'not a valid URL'
            )
        })

        it('should validate serverUrl and throw for non-http protocol', async () => {
            await expect(
                customMcpServersService.createCustomMcpServer({ name: 'Bad', serverUrl: 'ftp://example.com' }, 'org-1')
            ).rejects.toThrow('only http and https are allowed')
        })

        it('should re-throw InternalFlowiseError as-is', async () => {
            const specificError = new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'custom error')
            mockSave.mockRejectedValue(specificError)

            await expect(
                customMcpServersService.createCustomMcpServer({ name: 'Test', serverUrl: 'https://example.com' }, 'org-1')
            ).rejects.toThrow(specificError)
        })

        it('should wrap unknown errors in InternalFlowiseError', async () => {
            mockSave.mockRejectedValue(new Error('db crash'))

            await expect(
                customMcpServersService.createCustomMcpServer({ name: 'Test', serverUrl: 'https://example.com' }, 'org-1')
            ).rejects.toThrow(InternalFlowiseError)
        })
    })

    // ── getAllCustomMcpServers ───────────────────────────────────────────

    describe('getAllCustomMcpServers', () => {
        it('should return sanitized array when no pagination', async () => {
            const records = [
                makeRecord({ id: '1', serverUrl: 'https://api.example.com/mcp/token1', authConfig: 'encrypted-data' }),
                makeRecord({ id: '2', serverUrl: 'https://other.com', authConfig: null })
            ]
            mockGetManyAndCount.mockResolvedValue([records, 2])

            const result = await customMcpServersService.getAllCustomMcpServers('ws-1')

            expect(result).toBeInstanceOf(Array)
            const arr = result as any[]
            expect(arr).toHaveLength(2)
            // serverUrl should be masked
            expect(arr[0].serverUrl).toContain('************')
            expect(arr[0].serverUrl).not.toContain('token1')
            // authConfig should be stripped
            expect(arr[0]).not.toHaveProperty('authConfig')
        })

        it('should return paginated result when page and limit are positive', async () => {
            const records = [makeRecord()]
            mockGetManyAndCount.mockResolvedValue([records, 10])

            const result = await customMcpServersService.getAllCustomMcpServers('ws-1', 2, 5)

            expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5) // (2-1)*5
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(5)
            expect(result).toHaveProperty('data')
            expect(result).toHaveProperty('total', 10)
        })

        it('should filter by workspaceId when provided', async () => {
            mockGetManyAndCount.mockResolvedValue([[], 0])

            await customMcpServersService.getAllCustomMcpServers('ws-1')

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('custom_mcp_server.workspaceId = :workspaceId', {
                workspaceId: 'ws-1'
            })
        })

        it('should mask serverUrl with path segments', async () => {
            const records = [makeRecord({ serverUrl: 'https://api.example.com/mcp/secret-token' })]
            mockGetManyAndCount.mockResolvedValue([records, 1])

            const result = (await customMcpServersService.getAllCustomMcpServers('ws-1')) as any[]

            expect(result[0].serverUrl).toBe('https://api.example.com/************')
        })

        it('should return origin only for root-path URLs', async () => {
            const records = [makeRecord({ serverUrl: 'https://api.example.com' })]
            mockGetManyAndCount.mockResolvedValue([records, 1])

            const result = (await customMcpServersService.getAllCustomMcpServers('ws-1')) as any[]

            expect(result[0].serverUrl).toBe('https://api.example.com')
        })

        it('should return redacted value for invalid URLs', async () => {
            const records = [makeRecord({ serverUrl: 'not-a-url' })]
            mockGetManyAndCount.mockResolvedValue([records, 1])

            const result = (await customMcpServersService.getAllCustomMcpServers('ws-1')) as any[]

            expect(result[0].serverUrl).toBe('************')
        })

        it('should wrap errors in InternalFlowiseError', async () => {
            mockGetManyAndCount.mockRejectedValue(new Error('query failed'))

            await expect(customMcpServersService.getAllCustomMcpServers('ws-1')).rejects.toThrow(InternalFlowiseError)
        })
    })

    // ── getCustomMcpServerById ──────────────────────────────────────────

    describe('getCustomMcpServerById', () => {
        it('should return masked response without authConfig when no authConfig exists', async () => {
            mockGetOne.mockResolvedValue(makeRecord({ authConfig: null }))

            const result = await customMcpServersService.getCustomMcpServerById('mcp-1', 'ws-1')

            expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('custom_mcp_server.tools')
            expect(result.serverUrl).toContain('************')
            expect(result.authConfig).toBeUndefined()
        })

        it('should return masked headers when authConfig has headers', async () => {
            const encrypted = 'encrypted:' + JSON.stringify({ headers: { 'X-Api-Key': 'real-secret', Authorization: 'Bearer tok' } })
            mockGetOne.mockResolvedValue(makeRecord({ authConfig: encrypted }))

            const result = await customMcpServersService.getCustomMcpServerById('mcp-1', 'ws-1')

            expect(result.authConfig).toBeDefined()
            expect(result.authConfig!.headers['X-Api-Key']).toBe('************')
            expect(result.authConfig!.headers['Authorization']).toBe('************')
        })

        it('should return empty authConfig when decryption fails', async () => {
            mockGetOne.mockResolvedValue(makeRecord({ authConfig: 'bad-encrypted-data' }))
            mockDecrypt.mockRejectedValueOnce(new Error('decrypt fail'))

            const result = await customMcpServersService.getCustomMcpServerById('mcp-1', 'ws-1')

            expect(result.authConfig).toEqual({})
        })

        it('should return empty authConfig when decrypted value is not an object', async () => {
            mockGetOne.mockResolvedValue(makeRecord({ authConfig: 'some-data' }))
            mockDecrypt.mockResolvedValueOnce(null)

            const result = await customMcpServersService.getCustomMcpServerById('mcp-1', 'ws-1')

            expect(result.authConfig).toEqual({})
        })

        it('should throw NOT_FOUND when record does not exist', async () => {
            mockGetOne.mockResolvedValue(null)

            await expect(customMcpServersService.getCustomMcpServerById('mcp-1', 'ws-1')).rejects.toThrow(InternalFlowiseError)
            await expect(customMcpServersService.getCustomMcpServerById('mcp-1', 'ws-1')).rejects.toThrow('not found')
        })

        it('should wrap unknown errors in InternalFlowiseError', async () => {
            mockGetOne.mockRejectedValue(new Error('db error'))

            await expect(customMcpServersService.getCustomMcpServerById('mcp-1', 'ws-1')).rejects.toThrow(InternalFlowiseError)
        })
    })

    // ── updateCustomMcpServer ───────────────────────────────────────────

    describe('updateCustomMcpServer', () => {
        it('should update and return the record', async () => {
            const existing = makeRecord()
            mockFindOneBy.mockResolvedValue(existing)
            mockSave.mockResolvedValue({ ...existing, name: 'Updated' })

            const result = await customMcpServersService.updateCustomMcpServer('mcp-1', { name: 'Updated' }, 'ws-1')

            expect(mockFindOneBy).toHaveBeenCalledWith({ id: 'mcp-1', workspaceId: 'ws-1' })
            expect(mockMerge).toHaveBeenCalled()
            expect(mockSave).toHaveBeenCalled()
            expect(result.name).toBe('Updated')
        })

        it('should throw NOT_FOUND when record does not exist', async () => {
            mockFindOneBy.mockResolvedValue(null)

            await expect(customMcpServersService.updateCustomMcpServer('mcp-1', { name: 'X' }, 'ws-1')).rejects.toThrow('not found')
        })

        it('should preserve real serverUrl when client sends masked value', async () => {
            const existing = makeRecord({ serverUrl: 'https://real.example.com/secret' })
            mockFindOneBy.mockResolvedValue(existing)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            const body = { serverUrl: 'https://real.example.com/************' }
            await customMcpServersService.updateCustomMcpServer('mcp-1', body, 'ws-1')

            // The body.serverUrl should have been replaced with the real one
            expect(body.serverUrl).toBe('https://real.example.com/secret')
        })

        it('should validate new serverUrl when client sends a non-masked value', async () => {
            const existing = makeRecord()
            mockFindOneBy.mockResolvedValue(existing)

            await expect(customMcpServersService.updateCustomMcpServer('mcp-1', { serverUrl: 'ftp://bad.com' }, 'ws-1')).rejects.toThrow(
                'only http and https are allowed'
            )
        })

        it('should reject URL that partially contains the mask placeholder', async () => {
            // e.g. user edited the URL but left `************` somewhere in it —
            // the backend used to silently revert; we now reject explicitly.
            const existing = makeRecord({ serverUrl: 'https://real.example.com/secret' })
            mockFindOneBy.mockResolvedValue(existing)

            await expect(
                customMcpServersService.updateCustomMcpServer(
                    'mcp-1',
                    { serverUrl: 'https://typo-host.com/************' }, // new host but mask still present
                    'ws-1'
                )
            ).rejects.toThrow(/masked placeholder/)
        })

        it('should encrypt authConfig on update', async () => {
            const existing = makeRecord()
            mockFindOneBy.mockResolvedValue(existing)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            await customMcpServersService.updateCustomMcpServer('mcp-1', { authConfig: { headers: { 'X-Key': 'new' } } }, 'ws-1')

            expect(mockEncrypt).toHaveBeenCalled()
        })

        it('should merge redacted headers with existing encrypted values', async () => {
            const encryptedConfig = 'encrypted:' + JSON.stringify({ headers: { 'X-Key': 'real-secret' } })
            const existing = makeRecord({ authConfig: encryptedConfig })
            mockFindOneBy.mockResolvedValue(existing)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            const body = { authConfig: { headers: { 'X-Key': '************' } } }
            await customMcpServersService.updateCustomMcpServer('mcp-1', body, 'ws-1')

            // encryptCredentialData should have received the real secret, not the redacted value
            expect(mockEncrypt).toHaveBeenCalledWith(expect.objectContaining({ headers: { 'X-Key': 'real-secret' } }))
        })

        it('should reject header value that partially contains the mask placeholder', async () => {
            const encryptedConfig = 'encrypted:' + JSON.stringify({ headers: { 'X-Key': 'real-secret' } })
            const existing = makeRecord({ authConfig: encryptedConfig })
            mockFindOneBy.mockResolvedValue(existing)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            // User edited the value but left `************` in — not exactly the
            // placeholder, so we reject rather than persisting the literal string.
            const body = { authType: 'CUSTOM_HEADERS', authConfig: { headers: { 'X-Key': 'prefix-************' } } }
            await expect(customMcpServersService.updateCustomMcpServer('mcp-1', body, 'ws-1')).rejects.toThrow(/masked placeholder/)
        })

        it('should use incoming header value when not redacted', async () => {
            const encryptedConfig = 'encrypted:' + JSON.stringify({ headers: { 'X-Key': 'old-secret' } })
            const existing = makeRecord({ authConfig: encryptedConfig })
            mockFindOneBy.mockResolvedValue(existing)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            const body = { authConfig: { headers: { 'X-Key': 'brand-new-secret' } } }
            await customMcpServersService.updateCustomMcpServer('mcp-1', body, 'ws-1')

            expect(mockEncrypt).toHaveBeenCalledWith(expect.objectContaining({ headers: { 'X-Key': 'brand-new-secret' } }))
        })

        it('should force workspaceId on saved record (defense-in-depth)', async () => {
            const existing = makeRecord()
            mockFindOneBy.mockResolvedValue(existing)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            await customMcpServersService.updateCustomMcpServer('mcp-1', { name: 'Updated' }, 'ws-1')

            expect(existing.workspaceId).toBe('ws-1')
        })
    })

    // ── deleteCustomMcpServer ───────────────────────────────────────────

    describe('deleteCustomMcpServer', () => {
        it('should delete by id and workspaceId', async () => {
            mockDelete.mockResolvedValue({ affected: 1 })

            const result = await customMcpServersService.deleteCustomMcpServer('mcp-1', 'ws-1')

            expect(mockDelete).toHaveBeenCalledWith({ id: 'mcp-1', workspaceId: 'ws-1' })
            expect(result).toEqual({ affected: 1 })
        })

        it('should wrap errors in InternalFlowiseError', async () => {
            mockDelete.mockRejectedValue(new Error('db error'))

            await expect(customMcpServersService.deleteCustomMcpServer('mcp-1', 'ws-1')).rejects.toThrow(InternalFlowiseError)
        })
    })

    // ── authorizeCustomMcpServer ────────────────────────────────────────

    describe('authorizeCustomMcpServer', () => {
        it('should throw NOT_FOUND when record does not exist', async () => {
            mockFindOneBy.mockResolvedValue(null)

            await expect(customMcpServersService.authorizeCustomMcpServer('mcp-1', 'ws-1')).rejects.toThrow('not found')
        })

        it('should connect, discover tools, set AUTHORIZED status, and return record', async () => {
            const record = makeRecord({ serverUrl: 'https://example.com/mcp' })
            mockFindOneBy.mockResolvedValue(record)
            mockInitialize.mockResolvedValue(undefined)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            const result = await customMcpServersService.authorizeCustomMcpServer('mcp-1', 'ws-1')

            expect(MCPToolkit).toHaveBeenCalledWith({ url: 'https://example.com/mcp' }, 'sse')
            expect(mockInitialize).toHaveBeenCalled()
            expect(result.status).toBe(CustomMcpServerStatus.AUTHORIZED)
            expect(result.tools).toBeDefined()
            expect(mockClose).toHaveBeenCalled()
        })

        it('should include decrypted headers in server params when authType is CUSTOM_HEADERS', async () => {
            const encryptedConfig = 'encrypted:' + JSON.stringify({ headers: { 'X-Api-Key': 'my-secret' } })
            const record = makeRecord({ serverUrl: 'https://example.com', authType: 'CUSTOM_HEADERS', authConfig: encryptedConfig })
            mockFindOneBy.mockResolvedValue(record)
            mockInitialize.mockResolvedValue(undefined)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            await customMcpServersService.authorizeCustomMcpServer('mcp-1', 'ws-1')

            expect(MCPToolkit).toHaveBeenCalledWith({ url: 'https://example.com', headers: { 'X-Api-Key': 'my-secret' } }, 'sse')
        })

        it('should not include headers when authType is NONE even if authConfig is present', async () => {
            const encryptedConfig = 'encrypted:' + JSON.stringify({ headers: { 'X-Api-Key': 'stale-secret' } })
            const record = makeRecord({ serverUrl: 'https://example.com', authType: 'NONE', authConfig: encryptedConfig })
            mockFindOneBy.mockResolvedValue(record)
            mockInitialize.mockResolvedValue(undefined)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            await customMcpServersService.authorizeCustomMcpServer('mcp-1', 'ws-1')

            expect(MCPToolkit).toHaveBeenCalledWith({ url: 'https://example.com' }, 'sse')
            expect(mockDecrypt).not.toHaveBeenCalled()
        })

        it('should not include headers when authConfig has no headers', async () => {
            const encryptedConfig = 'encrypted:' + JSON.stringify({ other: 'data' })
            const record = makeRecord({ serverUrl: 'https://example.com', authConfig: encryptedConfig })
            mockFindOneBy.mockResolvedValue(record)
            mockInitialize.mockResolvedValue(undefined)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            await customMcpServersService.authorizeCustomMcpServer('mcp-1', 'ws-1')

            expect(MCPToolkit).toHaveBeenCalledWith({ url: 'https://example.com' }, 'sse')
        })

        it('should set ERROR status and throw when connection fails', async () => {
            const record = makeRecord({ serverUrl: 'https://example.com' })
            mockFindOneBy.mockResolvedValue(record)
            mockInitialize.mockRejectedValue(new Error('connection refused'))
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            await expect(customMcpServersService.authorizeCustomMcpServer('mcp-1', 'ws-1')).rejects.toThrow(
                'Failed to connect to Custom MCP server'
            )
            expect(record.status).toBe(CustomMcpServerStatus.ERROR)
            expect(mockSave).toHaveBeenCalled()
        })

        it('should close toolkit client even on failure', async () => {
            const record = makeRecord({ serverUrl: 'https://example.com' })
            mockFindOneBy.mockResolvedValue(record)
            mockInitialize.mockRejectedValue(new Error('fail'))
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            await expect(customMcpServersService.authorizeCustomMcpServer('mcp-1', 'ws-1')).rejects.toThrow()

            expect(mockClose).toHaveBeenCalled()
        })
    })

    // ── getDiscoveredTools ──────────────────────────────────────────────

    describe('getDiscoveredTools', () => {
        it('should throw NOT_FOUND when record does not exist', async () => {
            mockGetOne.mockResolvedValue(null)

            await expect(customMcpServersService.getDiscoveredTools('mcp-1', 'ws-1')).rejects.toThrow('not found')
        })

        it('should return empty array when tools is null', async () => {
            mockGetOne.mockResolvedValue(makeRecord({ tools: null }))

            const result = await customMcpServersService.getDiscoveredTools('mcp-1', 'ws-1')

            expect(result).toEqual([])
        })

        it('should return parsed tools array', async () => {
            const tools = { tools: [{ name: 'tool1' }, { name: 'tool2' }] }
            mockGetOne.mockResolvedValue(makeRecord({ tools: JSON.stringify(tools) }))

            const result = await customMcpServersService.getDiscoveredTools('mcp-1', 'ws-1')

            expect(result).toEqual([{ name: 'tool1' }, { name: 'tool2' }])
        })

        it('should return empty array when tools JSON is malformed', async () => {
            mockGetOne.mockResolvedValue(makeRecord({ tools: 'not-valid-json' }))

            const result = await customMcpServersService.getDiscoveredTools('mcp-1', 'ws-1')

            expect(result).toEqual([])
        })

        it('should return empty array when parsed tools has no tools key', async () => {
            mockGetOne.mockResolvedValue(makeRecord({ tools: JSON.stringify({ other: 'data' }) }))

            const result = await customMcpServersService.getDiscoveredTools('mcp-1', 'ws-1')

            expect(result).toEqual([])
        })
    })

    // ── Hardening additions ─────────────────────────────────────────────

    describe('SSRF denylist enforcement', () => {
        beforeEach(() => {
            mockCheckDenyList.mockReset().mockResolvedValue(undefined)
        })

        it('rejects create when checkDenyList throws (private IP / loopback / IMDS)', async () => {
            mockCheckDenyList.mockRejectedValueOnce(new Error('denied'))
            await expect(
                customMcpServersService.createCustomMcpServer({ name: 'T', serverUrl: 'http://169.254.169.254/' }, 'org-1')
            ).rejects.toThrow('Server URL is not allowed by policy')
        })

        it('rejects update when a new non-masked URL is denied', async () => {
            mockFindOneBy.mockResolvedValue(makeRecord())
            mockCheckDenyList.mockRejectedValueOnce(new Error('denied'))
            await expect(
                customMcpServersService.updateCustomMcpServer('mcp-1', { serverUrl: 'http://127.0.0.1:6379' }, 'ws-1')
            ).rejects.toThrow('Server URL is not allowed by policy')
        })

        it('does not call checkDenyList when update sends a masked URL', async () => {
            mockFindOneBy.mockResolvedValue(makeRecord({ serverUrl: 'https://real.example.com/secret' }))
            mockSave.mockImplementation((r: any) => Promise.resolve(r))
            await customMcpServersService.updateCustomMcpServer('mcp-1', { serverUrl: 'https://real.example.com/************' }, 'ws-1')
            expect(mockCheckDenyList).not.toHaveBeenCalled()
        })
    })

    describe('header validation enforcement', () => {
        beforeEach(() => {
            mockValidateCustomHeaders.mockReset()
        })

        it('runs validateCustomHeaders on create when authType is CUSTOM_HEADERS', async () => {
            mockSave.mockResolvedValue(makeRecord())
            await customMcpServersService.createCustomMcpServer(
                {
                    name: 'T',
                    serverUrl: 'https://example.com',
                    authType: 'CUSTOM_HEADERS',
                    authConfig: { headers: { 'X-Api-Key': 'v' } }
                },
                'org-1'
            )
            expect(mockValidateCustomHeaders).toHaveBeenCalledWith({ 'X-Api-Key': 'v' })
        })

        it('maps validator error to BAD_REQUEST', async () => {
            mockValidateCustomHeaders.mockImplementationOnce(() => {
                throw new Error('Invalid header "Host": not allowed')
            })
            await expect(
                customMcpServersService.createCustomMcpServer(
                    {
                        name: 'T',
                        serverUrl: 'https://example.com',
                        authType: 'CUSTOM_HEADERS',
                        authConfig: { headers: { Host: 'evil' } }
                    },
                    'org-1'
                )
            ).rejects.toThrow('Invalid header "Host": not allowed')
        })
    })

    describe('tools payload cap', () => {
        const ORIGINAL_ENV = process.env.CUSTOM_MCP_TOOLS_MAX_BYTES
        afterEach(() => {
            if (ORIGINAL_ENV === undefined) delete process.env.CUSTOM_MCP_TOOLS_MAX_BYTES
            else process.env.CUSTOM_MCP_TOOLS_MAX_BYTES = ORIGINAL_ENV
        })

        it('rejects authorize when serialized tools exceed the limit and marks row ERROR', async () => {
            process.env.CUSTOM_MCP_TOOLS_MAX_BYTES = '50'
            const record = makeRecord({ serverUrl: 'https://example.com' })
            mockFindOneBy.mockResolvedValue(record)
            mockInitialize.mockResolvedValue(undefined)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))
            // Big tool list — well over 50 bytes after stringify
            const bigTools = {
                tools: Array.from({ length: 20 }, (_, i) => ({ name: `tool_${i}`, description: 'x'.repeat(40) }))
            }
            mockToolkitImpl.mockImplementationOnce(() => ({
                initialize: mockInitialize,
                _tools: bigTools,
                client: { close: mockClose }
            }))

            await expect(customMcpServersService.authorizeCustomMcpServer('mcp-1', 'ws-1')).rejects.toThrow(
                /tools payload larger than the allowed limit/
            )
            expect(record.status).toBe(CustomMcpServerStatus.ERROR)
        })

        it('allows any payload when the cap is disabled via env=0', async () => {
            process.env.CUSTOM_MCP_TOOLS_MAX_BYTES = '0'
            const record = makeRecord({ serverUrl: 'https://example.com' })
            mockFindOneBy.mockResolvedValue(record)
            mockInitialize.mockResolvedValue(undefined)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            const result = await customMcpServersService.authorizeCustomMcpServer('mcp-1', 'ws-1')
            expect(result.status).toBe(CustomMcpServerStatus.AUTHORIZED)
        })
    })

    describe('toolCount population', () => {
        it('sets toolCount to the number of tools discovered', async () => {
            const record = makeRecord({ serverUrl: 'https://example.com' })
            mockFindOneBy.mockResolvedValue(record)
            mockInitialize.mockResolvedValue(undefined)
            mockSave.mockImplementation((r: any) => Promise.resolve(r))
            mockToolkitImpl.mockImplementationOnce(() => ({
                initialize: mockInitialize,
                _tools: { tools: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] },
                client: { close: mockClose }
            }))

            const result = await customMcpServersService.authorizeCustomMcpServer('mcp-1', 'ws-1')
            expect(result.toolCount).toBe(3)
        })
    })

    describe('authorize handshake timeout', () => {
        const ORIGINAL_ENV = process.env.CUSTOM_MCP_AUTHORIZE_TIMEOUT_MS
        afterEach(() => {
            if (ORIGINAL_ENV === undefined) delete process.env.CUSTOM_MCP_AUTHORIZE_TIMEOUT_MS
            else process.env.CUSTOM_MCP_AUTHORIZE_TIMEOUT_MS = ORIGINAL_ENV
        })

        it('rejects and marks ERROR when initialize() hangs past the timeout', async () => {
            // Override (env min-clamp normally prevents sub-1s, but we bypass the
            // min check by asserting the timeout behavior with a long hang.)
            process.env.CUSTOM_MCP_AUTHORIZE_TIMEOUT_MS = '1000'
            const record = makeRecord({ serverUrl: 'https://example.com' })
            mockFindOneBy.mockResolvedValue(record)
            // initialize() never resolves
            mockInitialize.mockReturnValue(new Promise(() => {}))
            mockSave.mockImplementation((r: any) => Promise.resolve(r))

            await expect(customMcpServersService.authorizeCustomMcpServer('mcp-1', 'ws-1')).rejects.toThrow(/exceeded 1000ms/)
            expect(record.status).toBe(CustomMcpServerStatus.ERROR)
            expect(mockClose).toHaveBeenCalled() // cleanup still runs
        }, 10_000)
    })
})
