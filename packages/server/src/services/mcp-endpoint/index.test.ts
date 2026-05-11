/**
 * Unit tests for MCP endpoint service (packages/server/src/services/mcp-endpoint/index.ts)
 *
 * Tests the service layer in isolation: auth error forwarding, config validation,
 * stateless request handling, and the internal chatflow tool callback
 * (result extraction + error handling).
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

// --- Mock: uuid (ESM module — must be mocked before import) ---
jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4'
}))

// --- Mock: chat-messages service (prevents @langchain/core transitive import) ---
jest.mock('../../services/chat-messages', () => ({
    __esModule: true,
    default: {
        abortChatMessage: jest.fn().mockResolvedValue(undefined)
    }
}))

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

// --- Import after mocking ---
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import mcpEndpointService from '.'

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
        it('uses optional question schema for AGENTFLOW type', async () => {
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(makeChatflow({ type: 'AGENTFLOW' }))

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(Object.keys(schema)).toContain('question')
        })

        it('uses mandatory question-only schema for CHATFLOW type', async () => {
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(makeChatflow({ type: 'CHATFLOW' }))

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(Object.keys(schema)).not.toContain('form')
            expect(Object.keys(schema)).toContain('question')
        })
    })

    describe('buildFormInputSchema', () => {
        function makeAgentflowWithFormInputs(formInputTypes: any[]) {
            return makeChatflow({
                type: 'AGENTFLOW',
                flowData: JSON.stringify({
                    nodes: [
                        {
                            data: {
                                name: 'startAgentflow',
                                inputs: {
                                    startInputType: 'formInput',
                                    formInputTypes
                                }
                            }
                        }
                    ],
                    edges: []
                })
            })
        }

        it('generates a form schema with string fields', async () => {
            const chatflow = makeAgentflowWithFormInputs([{ type: 'string', label: 'Name', name: 'name', addOptions: '' }])
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(Object.keys(schema)).toEqual(['form'])
            // The form field should be a zod object with a 'name' key in its shape
            expect(schema.form._def.typeName).toBe('ZodObject')
            expect(schema.form.shape).toHaveProperty('name')
            expect(schema.form.shape.name._def.typeName).toBe('ZodString')
        })

        it('generates a form schema with number fields', async () => {
            const chatflow = makeAgentflowWithFormInputs([{ type: 'number', label: 'Age', name: 'age', addOptions: '' }])
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(schema.form.shape).toHaveProperty('age')
            expect(schema.form.shape.age._def.typeName).toBe('ZodNumber')
        })

        it('generates a form schema with boolean fields', async () => {
            const chatflow = makeAgentflowWithFormInputs([{ type: 'boolean', label: 'Adult', name: 'is_adult', addOptions: '' }])
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(schema.form.shape).toHaveProperty('is_adult')
            expect(schema.form.shape.is_adult._def.typeName).toBe('ZodBoolean')
        })

        it('generates a form schema with options (enum) fields', async () => {
            const chatflow = makeAgentflowWithFormInputs([
                { type: 'options', label: 'Favorite Drink', name: 'favorite_drink', addOptions: [{ option: 'Tea' }, { option: 'Coffee' }] }
            ])
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(schema.form.shape).toHaveProperty('favorite_drink')
            expect(schema.form.shape.favorite_drink._def.typeName).toBe('ZodEnum')
            expect(schema.form.shape.favorite_drink._def.values).toEqual(['Tea', 'Coffee'])
        })

        it('generates a combined schema with multiple field types', async () => {
            const chatflow = makeAgentflowWithFormInputs([
                { type: 'string', label: 'Name', name: 'name', addOptions: '' },
                { type: 'number', label: 'Age', name: 'age', addOptions: '' },
                { type: 'boolean', label: 'Adult', name: 'is_adult', addOptions: '' },
                { type: 'options', label: 'Favorite Drink', name: 'favorite_drink', addOptions: [{ option: 'Tea' }, { option: 'Coffee' }] }
            ])
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            const shapeKeys = Object.keys(schema.form.shape)
            expect(shapeKeys).toEqual(['name', 'age', 'is_adult', 'favorite_drink'])
            expect(schema.form.shape.name._def.typeName).toBe('ZodString')
            expect(schema.form.shape.age._def.typeName).toBe('ZodNumber')
            expect(schema.form.shape.is_adult._def.typeName).toBe('ZodBoolean')
            expect(schema.form.shape.favorite_drink._def.typeName).toBe('ZodEnum')
        })

        it('attaches label as description on each field', async () => {
            const chatflow = makeAgentflowWithFormInputs([{ type: 'string', label: 'Full Name', name: 'full_name', addOptions: '' }])
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(schema.form.shape.full_name.description).toBe('Full Name')
        })

        it('throws an error when form input configuration is invalid', async () => {
            const chatflow = makeAgentflowWithFormInputs([{ type: 'unknown', label: 'Field', name: 'field', addOptions: '' }])
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)

            await expect(mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())).rejects.toThrow(
                'Failed to build form input schema due to invalid configuration'
            )
        })

        it('skips options field when addOptions is a string', async () => {
            const chatflow = makeAgentflowWithFormInputs([
                { type: 'options', label: 'Favorite Drink', name: 'favorite_drink', addOptions: '' }
            ])
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(schema.form.shape.favorite_drink).toBeUndefined()
        })

        it('skips options field when addOptions is undefined', async () => {
            const chatflow = makeAgentflowWithFormInputs([
                { type: 'options', label: 'Favorite Drink', name: 'favorite_drink', addOptions: undefined }
            ])
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(schema.form.shape.favorite_drink).toBeUndefined()
        })

        it('skips options field when addOptions is null', async () => {
            const chatflow = makeAgentflowWithFormInputs([
                { type: 'options', label: 'Favorite Drink', name: 'favorite_drink', addOptions: null }
            ])
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(schema.form.shape.favorite_drink).toBeUndefined()
        })

        it('skips options field when addOptions is an empty array', async () => {
            const chatflow = makeAgentflowWithFormInputs([
                { type: 'options', label: 'Favorite Drink', name: 'favorite_drink', addOptions: [] }
            ])
            mockGetChatflowByIdAndVerifyToken.mockResolvedValue(chatflow)

            await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())

            const schema = mockMcpTool.mock.calls[0][2] as Record<string, any>
            expect(schema.form.shape.favorite_drink).toBeUndefined()
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
        // Re-establish the tool callback with an AGENTFLOW chatflow that uses formInput
        const agentflowChatflow = makeChatflow({
            type: 'AGENTFLOW',
            flowData: JSON.stringify({
                nodes: [
                    {
                        data: {
                            name: 'startAgentflow',
                            inputs: {
                                startInputType: 'formInput',
                                formInputTypes: [
                                    { type: 'string', label: 'Name', name: 'name', addOptions: '' },
                                    { type: 'string', label: 'Age', name: 'age', addOptions: '' }
                                ]
                            }
                        }
                    }
                ],
                edges: []
            })
        })
        mockGetChatflowByIdAndVerifyToken.mockResolvedValue(agentflowChatflow)
        await mcpEndpointService.handleMcpRequest('flow-123', 'token', makeReq() as any, makeRes())
        const formToolCallback = mockMcpTool.mock.calls[mockMcpTool.mock.calls.length - 1][3]

        mockUtilBuildChatflow.mockResolvedValue('ok')
        const form = { name: 'Alice', age: '30' }

        await formToolCallback({ form })

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
