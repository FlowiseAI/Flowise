/**
 * Unit tests for MCP endpoint service (packages/server/src/services/mcp-endpoint/index.ts)
 *
 * Tests the service layer in isolation: auth error forwarding, config validation,
 * stateless request handling, SSE session lifecycle, message routing, and the
 * internal chatflow tool callback (result extraction + error handling).
 *
 * Controller tests (controllers/mcp-endpoint/index.test.ts) already cover the
 * Express middleware layer; these tests focus exclusively on the service functions
 * that are NOT exercised there.
 */

// --- Mock: typeorm decorators (virtual: true for pnpm resolution) ---
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

// --- Mock: mcp-server service ---
const mockGetChatflowByIdAndVerifyToken = jest.fn()
const mockParseMcpConfig = jest.fn()

jest.mock('../mcp-server/index', () => ({
    __esModule: true,
    default: {
        getChatflowByIdAndVerifyToken: (...args: any[]) => mockGetChatflowByIdAndVerifyToken(...args),
        parseMcpConfig: (...args: any[]) => mockParseMcpConfig(...args)
    }
}))

// --- Mock: utilities ---
const mockUtilBuildChatflow = jest.fn()
jest.mock('../../utils/buildChatflow', () => ({
    utilBuildChatflow: (...args: any[]) => mockUtilBuildChatflow(...args)
}))

const mockCreateMockRequest = jest.fn()
jest.mock('../../utils/mockRequest', () => ({
    createMockRequest: (...args: any[]) => mockCreateMockRequest(...args)
}))

jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}))

// --- Mock: MCP SDK ---
const mockMcpTool = jest.fn()
const mockMcpConnect = jest.fn().mockResolvedValue(undefined)
const mockMcpClose = jest.fn().mockResolvedValue(undefined)

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
    McpServer: jest.fn().mockImplementation(() => ({
        tool: mockMcpTool,
        connect: mockMcpConnect,
        close: mockMcpClose
    }))
}))

const mockHandleRequest = jest.fn().mockResolvedValue(undefined)
jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
    StreamableHTTPServerTransport: jest.fn().mockImplementation(() => ({
        handleRequest: mockHandleRequest
    }))
}))

const mockHandlePostMessage = jest.fn().mockResolvedValue(undefined)
jest.mock('@modelcontextprotocol/sdk/server/sse.js', () => ({
    SSEServerTransport: jest.fn()
}))

// --- Import after mocking ---
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import mcpEndpointService, { MAX_SSE_SESSIONS_PER_CHATFLOW } from '.'

// --- Helpers ---

function makeChatflow(overrides: Record<string, any> = {}) {
    return {
        id: 'flow-123',
        name: 'Test Chatflow',
        type: 'CHATFLOW',
        workspaceId: 'ws-1',
        mcpServerConfig: undefined as string | undefined,
        ...overrides
    }
}

function makeConfig(overrides: Record<string, any> = {}) {
    return {
        enabled: true,
        token: 'a'.repeat(32),
        description: 'Test description',
        toolName: 'test_tool',
        ...overrides
    }
}

function makeReq(overrides: Record<string, any> = {}) {
    return {
        params: { chatflowId: 'flow-123' },
        headers: {},
        query: {},
        body: { question: 'hello' },
        get: jest.fn(),
        ...overrides
    }
}

/** Creates a mock Response that captures 'close' event handlers and can fire them. */
function makeRes() {
    const closeHandlers: Function[] = []
    const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        locals: {},
        on: jest.fn().mockImplementation((event: string, handler: Function) => {
            if (event === 'close') closeHandlers.push(handler)
        }),
        triggerClose: () => closeHandlers.forEach((fn) => fn())
    }
    return res
}

// --- Global beforeEach ---
beforeEach(() => {
    jest.clearAllMocks()

    // Auth: default success
    const chatflow = makeChatflow({ mcpServerConfig: JSON.stringify(makeConfig()) })
    mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)
    mockParseMcpConfig.mockReturnValue(makeConfig())

    // Default SSE transport (overridden per test where needed)
    ;(SSEServerTransport as unknown as jest.Mock).mockImplementation(() => ({
        sessionId: 'default-session',
        handlePostMessage: mockHandlePostMessage
    }))

    // Default chatflow build result
    mockUtilBuildChatflow.mockResolvedValue('chatflow answer')
    mockCreateMockRequest.mockReturnValue({ mocked: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// handleMcpRequest (stateless Streamable HTTP)
// ─────────────────────────────────────────────────────────────────────────────
describe('handleMcpRequest', () => {
    it('returns 401 when getChatflowByIdAndVerifyToken throws UNAUTHORIZED', async () => {
        mockGetChatflowByIdAndVerifyToken.mockRejectedValue(new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Invalid token'))
        const res = makeRes()

        await mcpEndpointService.handleMcpRequest('flow-123', 'bad-token', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ jsonrpc: '2.0', error: expect.objectContaining({ code: -32001 }) }))
        expect(mockHandleRequest).not.toHaveBeenCalled()
    })

    it('returns 404 when getChatflowByIdAndVerifyToken throws NOT_FOUND', async () => {
        mockGetChatflowByIdAndVerifyToken.mockRejectedValue(new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Not found'))
        const res = makeRes()

        await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ jsonrpc: '2.0', error: expect.objectContaining({ code: -32001 }) }))
    })

    it('rethrows non-InternalFlowiseError auth errors', async () => {
        const dbError = new Error('DB connection failed')
        mockGetChatflowByIdAndVerifyToken.mockRejectedValue(dbError)

        await expect(mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())).rejects.toThrow(
            'DB connection failed'
        )
    })

    it('returns 404 when config is null', async () => {
        mockParseMcpConfig.mockReturnValue(null)
        const res = makeRes()

        await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ jsonrpc: '2.0', error: expect.objectContaining({ code: -32001 }) }))
    })

    it('returns 404 when config.enabled is false', async () => {
        mockParseMcpConfig.mockReturnValue(makeConfig({ enabled: false }))
        const res = makeRes()

        await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(404)
    })

    it('calls mcpServer.connect and transport.handleRequest on success', async () => {
        const req = makeReq() as any
        const res = makeRes()

        await mcpEndpointService.handleMcpRequest('flow-123', 'token', req, res)

        expect(mockMcpConnect).toHaveBeenCalledTimes(1)
        expect(mockHandleRequest).toHaveBeenCalledWith(req, res, req.body)
    })

    it('registers the tool with toolName and description from config', async () => {
        mockParseMcpConfig.mockReturnValue(makeConfig({ toolName: 'my_flow_tool', description: 'My Flow' }))

        await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

        expect(mockMcpTool).toHaveBeenCalledWith('my_flow_tool', 'My Flow', expect.any(Object), expect.any(Function))
    })

    it('sanitizes chatflow name as toolName when config has no toolName', async () => {
        mockParseMcpConfig.mockReturnValue(makeConfig({ toolName: undefined }))
        mockGetChatflowByIdAndVerifyToken.mockResolvedValue(makeChatflow({ name: 'My Complex Flow! V2' }))

        await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

        const registeredName = mockMcpTool.mock.calls[0][0] as string
        expect(registeredName).toMatch(/^[a-z0-9_-]+$/)
        expect(registeredName).not.toMatch(/^_|_$/)
        expect(registeredName).toBe('my_complex_flow_v2')
    })

    it('uses default description when config.description is absent', async () => {
        const chatflow = makeChatflow({ name: 'My Chatflow' })
        mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)
        mockParseMcpConfig.mockReturnValue(makeConfig({ description: undefined }))

        await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

        const registeredDesc = mockMcpTool.mock.calls[0][1] as string
        expect(registeredDesc).toContain('My Chatflow')
    })

    it('sets up res.on("close") to close the MCP server', async () => {
        const res = makeRes()

        await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, res)

        expect(res.on).toHaveBeenCalledWith('close', expect.any(Function))
        // Firing close should call mcpServer.close
        res.triggerClose()
        expect(mockMcpClose).toHaveBeenCalled()
    })

    describe('input schema selection', () => {
        it('uses optional question + form schema for AGENTFLOW type', async () => {
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(makeChatflow({ type: 'AGENTFLOW' }))

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            // AGENTFLOW schema includes 'form' key; CHATFLOW schema does not
            expect(Object.keys(schema)).toContain('form')
            expect(Object.keys(schema)).toContain('question')
        })

        it('uses optional question + form schema for MULTIAGENT type', async () => {
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(makeChatflow({ type: 'MULTIAGENT' }))

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(Object.keys(schema)).toContain('form')
        })

        it('uses mandatory question-only schema for CHATFLOW type', async () => {
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(makeChatflow({ type: 'CHATFLOW' }))

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(Object.keys(schema)).not.toContain('form')
            expect(Object.keys(schema)).toContain('question')
        })
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// Chatflow tool callback (chatflowCallback — called when MCP tool is invoked)
// ─────────────────────────────────────────────────────────────────────────────
describe('chatflow tool callback', () => {
    let toolCallback: Function

    beforeEach(async () => {
        await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())
        // The callback is the 4th argument passed to mcpServer.tool(name, desc, schema, callback)
        toolCallback = mockMcpTool.mock.calls[0][3]
    })

    it('returns a string result directly as text content', async () => {
        mockUtilBuildChatflow.mockResolvedValue('hello world')

        const result = await toolCallback({ question: 'what?' })

        expect(result).toEqual({ content: [{ type: 'text', text: 'hello world' }] })
    })

    it('extracts result.text when the response has a text field', async () => {
        mockUtilBuildChatflow.mockResolvedValue({ text: 'extracted answer' })

        const result = await toolCallback({ question: 'what?' })

        expect(result).toEqual({ content: [{ type: 'text', text: 'extracted answer' }] })
    })

    it('stringifies result.json when the response has a json field', async () => {
        const jsonPayload = { answer: 42, items: ['a', 'b'] }
        mockUtilBuildChatflow.mockResolvedValue({ json: jsonPayload })

        const result = await toolCallback({ question: 'what?' })

        expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify(jsonPayload) }] })
    })

    it('stringifies the full result object when no recognised fields are present', async () => {
        const obj = { other: 'data', n: 1 }
        mockUtilBuildChatflow.mockResolvedValue(obj)

        const result = await toolCallback({ question: 'what?' })

        expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify(obj) }] })
    })

    it('returns isError:true and a text message when utilBuildChatflow throws', async () => {
        mockUtilBuildChatflow.mockRejectedValue(new Error('Build failed'))

        const result = await toolCallback({ question: 'what?' })

        expect(result.isError).toBe(true)
        expect(result.content).toHaveLength(1)
        expect(result.content[0].type).toBe('text')
    })

    it('calls createMockRequest with the chatflowId and question', async () => {
        mockUtilBuildChatflow.mockResolvedValue('ok')

        await toolCallback({ question: 'my question' })

        expect(mockCreateMockRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                chatflowId: 'flow-123',
                body: expect.objectContaining({ question: 'my question' })
            })
        )
    })

    it('includes form in the request body when args.form is provided', async () => {
        mockUtilBuildChatflow.mockResolvedValue('ok')
        const form = { name: 'Alice', age: '30' }

        await toolCallback({ question: 'submit', form })

        expect(mockCreateMockRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                body: expect.objectContaining({ form })
            })
        )
    })

    it('omits form from the request body when args.form is absent', async () => {
        mockUtilBuildChatflow.mockResolvedValue('ok')

        await toolCallback({ question: 'no form here' })

        const callArgs = mockCreateMockRequest.mock.calls[0][0]
        expect(callArgs.body).not.toHaveProperty('form')
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// handleMcpSseRequest (SSE GET — deprecated transport)
// ─────────────────────────────────────────────────────────────────────────────
describe('handleMcpSseRequest', () => {
    it('returns 401 when getChatflowByIdAndVerifyToken throws UNAUTHORIZED', async () => {
        mockGetChatflowByIdAndVerifyToken.mockRejectedValue(new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Unauthorized'))
        const res = makeRes()

        await mcpEndpointService.handleMcpSseRequest('flow-123', 'bad-token', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ jsonrpc: '2.0', error: expect.objectContaining({ code: -32001 }) }))
    })

    it('returns 404 when getChatflowByIdAndVerifyToken throws NOT_FOUND', async () => {
        mockGetChatflowByIdAndVerifyToken.mockRejectedValue(new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Not found'))
        const res = makeRes()

        await mcpEndpointService.handleMcpSseRequest('flow-123', 'token', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(404)
    })

    it('rethrows non-InternalFlowiseError auth errors', async () => {
        mockGetChatflowByIdAndVerifyToken.mockRejectedValue(new Error('DB error'))

        await expect(mcpEndpointService.handleMcpSseRequest('flow-123', 'token', makeReq() as any, makeRes())).rejects.toThrow('DB error')
    })

    it('returns 404 when config is null', async () => {
        mockParseMcpConfig.mockReturnValue(null)
        const res = makeRes()

        await mcpEndpointService.handleMcpSseRequest('flow-123', 'token', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 404 when config.enabled is false', async () => {
        mockParseMcpConfig.mockReturnValue(makeConfig({ enabled: false }))
        const res = makeRes()

        await mcpEndpointService.handleMcpSseRequest('flow-123', 'token', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 429 when 20 SSE sessions already exist for the same chatflow', async () => {
        let counter = 0
        ;(SSEServerTransport as unknown as jest.Mock).mockImplementation(() => ({
            sessionId: `session-limit-${++counter}`,
            handlePostMessage: mockHandlePostMessage
        }))

        const resObjects: ReturnType<typeof makeRes>[] = []
        try {
            // Fill up exactly MAX_SSE_SESSIONS_PER_CHATFLOW (20) sessions
            for (let i = 0; i < MAX_SSE_SESSIONS_PER_CHATFLOW; i++) {
                const res = makeRes()
                resObjects.push(res)
                await mcpEndpointService.handleMcpSseRequest('flow-123', 'token', makeReq() as any, res)
            }

            // The 21st request for the same chatflow should be rate-limited
            const blockedRes = makeRes()
            await mcpEndpointService.handleMcpSseRequest('flow-123', 'token', makeReq() as any, blockedRes)

            expect(blockedRes.status).toHaveBeenCalledWith(429)
            expect(blockedRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    jsonrpc: '2.0',
                    error: expect.objectContaining({ code: -32000 })
                })
            )
        } finally {
            // Clean up: trigger close on all sessions to drain sseSessions map
            resObjects.forEach((res) => res.triggerClose())
        }
    })

    it('calls mcpServer.connect on success', async () => {
        const res = makeRes()

        await mcpEndpointService.handleMcpSseRequest('flow-123', 'token', makeReq() as any, res)

        expect(mockMcpConnect).toHaveBeenCalledTimes(1)

        // Cleanup
        res.triggerClose()
    })

    it('removes the session and closes mcpServer when the SSE connection closes', async () => {
        ;(SSEServerTransport as unknown as jest.Mock).mockImplementation(() => ({
            sessionId: 'session-cleanup-test',
            handlePostMessage: mockHandlePostMessage
        }))
        const res = makeRes()

        await mcpEndpointService.handleMcpSseRequest('flow-123', 'token', makeReq() as any, res)

        // Session should exist — a valid message request would succeed
        // Trigger the close event
        res.triggerClose()

        // After close, the session is gone — routing a message should return 404
        const msgRes = makeRes()
        await mcpEndpointService.handleMcpSseMessageRequest('flow-123', 'token', 'session-cleanup-test', makeReq() as any, msgRes)
        expect(msgRes.status).toHaveBeenCalledWith(404)
        expect(mockMcpClose).toHaveBeenCalled()
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// handleMcpSseMessageRequest (SSE message routing)
// ─────────────────────────────────────────────────────────────────────────────
describe('handleMcpSseMessageRequest', () => {
    it('returns 401 when getChatflowByIdAndVerifyToken throws UNAUTHORIZED', async () => {
        mockGetChatflowByIdAndVerifyToken.mockRejectedValue(new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Unauthorized'))
        const res = makeRes()

        await mcpEndpointService.handleMcpSseMessageRequest('flow-123', 'bad-token', 'sess-1', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 404 when getChatflowByIdAndVerifyToken throws NOT_FOUND', async () => {
        mockGetChatflowByIdAndVerifyToken.mockRejectedValue(new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Not found'))
        const res = makeRes()

        await mcpEndpointService.handleMcpSseMessageRequest('flow-123', 'token', 'sess-1', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(404)
    })

    it('rethrows non-InternalFlowiseError errors from auth', async () => {
        mockGetChatflowByIdAndVerifyToken.mockRejectedValue(new Error('Unexpected DB error'))

        await expect(
            mcpEndpointService.handleMcpSseMessageRequest('flow-123', 'token', 'sess-1', makeReq() as any, makeRes())
        ).rejects.toThrow('Unexpected DB error')
    })

    it('returns 404 when sessionId is not found in active sessions', async () => {
        // No session established — sseSessions is empty for this sessionId
        const res = makeRes()

        await mcpEndpointService.handleMcpSseMessageRequest('flow-123', 'token', 'nonexistent-session', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                jsonrpc: '2.0',
                error: expect.objectContaining({ code: -32000 })
            })
        )
    })

    describe('with an active SSE session', () => {
        let sseRes: ReturnType<typeof makeRes>
        const SESSION_ID = 'active-msg-session'

        beforeEach(async () => {
            // Establish an SSE session for 'flow-123'
            ;(SSEServerTransport as unknown as jest.Mock).mockImplementation(() => ({
                sessionId: SESSION_ID,
                handlePostMessage: mockHandlePostMessage
            }))
            sseRes = makeRes()
            await mcpEndpointService.handleMcpSseRequest('flow-123', 'token', makeReq() as any, sseRes)
            jest.clearAllMocks()
            // Re-arm auth mock after clearAllMocks (implementations survive; call counts reset)
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(makeChatflow({ mcpServerConfig: JSON.stringify(makeConfig()) }))
        })

        afterEach(() => {
            sseRes.triggerClose()
        })

        it('calls transport.handlePostMessage with req, res, and body for a valid session', async () => {
            const req = makeReq({ body: { jsonrpc: '2.0', method: 'tools/list', id: 1 } }) as any
            const res = makeRes()

            await mcpEndpointService.handleMcpSseMessageRequest('flow-123', 'token', SESSION_ID, req, res)

            expect(mockHandlePostMessage).toHaveBeenCalledWith(req, res, req.body)
        })

        it('returns 404 when sessionId exists but belongs to a different chatflow', async () => {
            const res = makeRes()

            // 'flow-DIFFERENT' does not own SESSION_ID (which was created for 'flow-123')
            await mcpEndpointService.handleMcpSseMessageRequest('flow-DIFFERENT', 'token', SESSION_ID, makeReq() as any, res)

            expect(res.status).toHaveBeenCalledWith(404)
            expect(mockHandlePostMessage).not.toHaveBeenCalled()
        })
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// handleMcpDeleteRequest
// ─────────────────────────────────────────────────────────────────────────────
describe('handleMcpDeleteRequest', () => {
    it('always returns 405 (session termination not supported in stateless mode)', async () => {
        const res = makeRes()

        await mcpEndpointService.handleMcpDeleteRequest('flow-123', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(405)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                jsonrpc: '2.0',
                error: expect.objectContaining({ code: -32000 })
            })
        )
    })

    it('returns 405 regardless of chatflowId', async () => {
        const res = makeRes()

        await mcpEndpointService.handleMcpDeleteRequest('any-flow-id', makeReq() as any, res)

        expect(res.status).toHaveBeenCalledWith(405)
    })
})
