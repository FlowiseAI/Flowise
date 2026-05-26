import express from 'express'
import http from 'http'
import { v4 as uuidv4 } from 'uuid'
import { A2AClientWrapper, IA2AClientConfig } from './a2aClient'

// ---------------------------------------------------------------------------
// Mock A2A Server
// ---------------------------------------------------------------------------

function makeAgentCard(serverUrl: string) {
    return {
        name: 'Integration Test Agent',
        url: serverUrl,
        version: '1.0.0',
        description: 'A mock agent for integration testing',
        capabilities: {
            streaming: true
        },
        skills: [
            { id: 'echo', name: 'Echo', description: 'Returns the input text as output' },
            { id: 'multi-turn', name: 'Multi Turn', description: 'Requires two turns to complete' },
            { id: 'slow', name: 'Slow', description: 'Delays 5 seconds before responding' }
        ],
        defaultInputModes: ['text/plain'],
        defaultOutputModes: ['text/plain', 'application/json']
    }
}

const multiTurnState = new Map<string, { turn: number; contextId: string }>()
const activeTimers = new Set<ReturnType<typeof setTimeout>>()

function createMockA2AServer(opts: { requireApiKey?: string; requireBearerToken?: string } = {}): {
    app: express.Express
    setUrl: (url: string) => void
} {
    const app = express()
    app.use(express.json())

    let agentCard = makeAgentCard('')

    app.get('/.well-known/agent.json', (_req, res) => {
        res.json(agentCard)
    })

    app.post('/', (req, res) => {
        // Auth checks on JSON-RPC endpoint only
        if (opts.requireApiKey) {
            const key = req.headers['x-api-key']
            if (key !== opts.requireApiKey) {
                res.status(401).json({
                    jsonrpc: '2.0',
                    id: req.body?.id,
                    error: { code: -32000, message: 'Unauthorized: invalid API key' }
                })
                return
            }
        }
        if (opts.requireBearerToken) {
            const auth = req.headers['authorization']
            if (auth !== `Bearer ${opts.requireBearerToken}`) {
                res.status(401).json({
                    jsonrpc: '2.0',
                    id: req.body?.id,
                    error: { code: -32000, message: 'Unauthorized: invalid bearer token' }
                })
                return
            }
        }

        const { method, params, id } = req.body

        if (method === 'message/send') {
            handleSendMessage(params, id, res)
        } else if (method === 'message/stream') {
            handleSendMessageStream(params, id, res)
        } else if (method === 'tasks/cancel') {
            res.json({
                jsonrpc: '2.0',
                id,
                result: {
                    kind: 'task',
                    id: params?.id || 'unknown',
                    contextId: 'ctx-cancel',
                    status: { state: 'canceled' },
                    artifacts: []
                }
            })
        } else {
            res.json({
                jsonrpc: '2.0',
                id,
                error: { code: -32601, message: `Method not found: ${method}` }
            })
        }
    })

    return {
        app,
        setUrl: (url: string) => {
            agentCard = makeAgentCard(url)
        }
    }
}

function handleSendMessage(params: any, rpcId: any, res: express.Response): void {
    const message = params?.message
    const inputText = extractTextFromParts(message?.parts || [])
    const skillId = params?.metadata?.skillId || detectSkill(inputText)
    const taskId = message?.taskId || uuidv4()
    const contextId = message?.contextId || uuidv4()

    if (skillId === 'echo') {
        res.json({
            jsonrpc: '2.0',
            id: rpcId,
            result: {
                kind: 'task',
                id: taskId,
                contextId,
                status: {
                    state: 'completed',
                    message: {
                        kind: 'message',
                        messageId: uuidv4(),
                        role: 'agent',
                        parts: [{ kind: 'text', text: inputText }]
                    }
                },
                artifacts: [
                    {
                        artifactId: uuidv4(),
                        parts: [{ kind: 'text', text: `Echo: ${inputText}` }]
                    }
                ]
            }
        })
        return
    }

    if (skillId === 'multi-turn') {
        const existing = multiTurnState.get(taskId)
        if (!existing) {
            multiTurnState.set(taskId, { turn: 1, contextId })
            res.json({
                jsonrpc: '2.0',
                id: rpcId,
                result: {
                    kind: 'task',
                    id: taskId,
                    contextId,
                    status: {
                        state: 'input-required',
                        message: {
                            kind: 'message',
                            messageId: uuidv4(),
                            role: 'agent',
                            parts: [{ kind: 'text', text: 'Please provide more details' }]
                        }
                    },
                    artifacts: []
                }
            })
            return
        }

        multiTurnState.delete(taskId)
        res.json({
            jsonrpc: '2.0',
            id: rpcId,
            result: {
                kind: 'task',
                id: taskId,
                contextId: existing.contextId,
                status: {
                    state: 'completed',
                    message: {
                        kind: 'message',
                        messageId: uuidv4(),
                        role: 'agent',
                        parts: [{ kind: 'text', text: `Completed with: ${inputText}` }]
                    }
                },
                artifacts: []
            }
        })
        return
    }

    if (skillId === 'slow') {
        const timer = setTimeout(() => {
            activeTimers.delete(timer)
            if (res.writableEnded) return
            res.json({
                jsonrpc: '2.0',
                id: rpcId,
                result: {
                    kind: 'task',
                    id: taskId,
                    contextId,
                    status: {
                        state: 'completed',
                        message: {
                            kind: 'message',
                            messageId: uuidv4(),
                            role: 'agent',
                            parts: [{ kind: 'text', text: 'Slow response done' }]
                        }
                    },
                    artifacts: []
                }
            })
        }, 5000)
        activeTimers.add(timer)
        return
    }

    // Default echo
    res.json({
        jsonrpc: '2.0',
        id: rpcId,
        result: {
            kind: 'task',
            id: taskId,
            contextId,
            status: {
                state: 'completed',
                message: {
                    kind: 'message',
                    messageId: uuidv4(),
                    role: 'agent',
                    parts: [{ kind: 'text', text: inputText }]
                }
            },
            artifacts: []
        }
    })
}

function handleSendMessageStream(params: any, rpcId: any, res: express.Response): void {
    const message = params?.message
    const inputText = extractTextFromParts(message?.parts || [])
    const skillId = params?.metadata?.skillId || detectSkill(inputText)
    const taskId = message?.taskId || uuidv4()
    const contextId = message?.contextId || uuidv4()

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', id: rpcId, result: data })}\n\n`)
    }

    if (skillId === 'echo') {
        // status → working
        sendEvent({
            kind: 'status-update',
            taskId,
            contextId,
            final: false,
            status: { state: 'working', message: null }
        })

        // artifact
        sendEvent({
            kind: 'artifact-update',
            taskId,
            contextId,
            append: false,
            lastChunk: true,
            artifact: {
                artifactId: uuidv4(),
                parts: [{ kind: 'text', text: inputText }]
            }
        })

        // completed
        sendEvent({
            kind: 'status-update',
            taskId,
            contextId,
            final: true,
            status: {
                state: 'completed',
                message: {
                    kind: 'message',
                    messageId: uuidv4(),
                    role: 'agent',
                    parts: [{ kind: 'text', text: inputText }]
                }
            }
        })

        res.end()
        return
    }

    // Default: same as echo for streaming
    sendEvent({
        kind: 'status-update',
        taskId,
        contextId,
        final: true,
        status: {
            state: 'completed',
            message: {
                kind: 'message',
                messageId: uuidv4(),
                role: 'agent',
                parts: [{ kind: 'text', text: inputText }]
            }
        }
    })
    res.end()
}

function extractTextFromParts(parts: any[]): string {
    return parts
        .filter((p: any) => p.kind === 'text')
        .map((p: any) => p.text)
        .join('\n')
}

function detectSkill(text: string): string {
    if (text.toLowerCase().includes('slow')) return 'slow'
    if (text.toLowerCase().includes('multi-turn')) return 'multi-turn'
    return 'echo'
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let server: http.Server
let serverUrl: string

function baseConfig(overrides: Partial<IA2AClientConfig> = {}): IA2AClientConfig {
    return {
        agentCardUrl: serverUrl,
        ...overrides
    }
}

function closeServer(srv: http.Server): Promise<void> {
    return new Promise((resolve) => {
        for (const timer of activeTimers) {
            clearTimeout(timer)
        }
        activeTimers.clear()
        srv.closeAllConnections()
        srv.close(() => resolve())
    })
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('A2AClientWrapper integration tests', () => {
    const ORIG_HTTP_SECURITY_CHECK = process.env.HTTP_SECURITY_CHECK
    const ORIG_ALLOW_INSECURE_HTTP = process.env.A2A_ALLOW_INSECURE_HTTP

    beforeAll((done) => {
        // Allow secureFetch to reach the loopback mock server (127.0.0.1) by
        // disabling the default IP deny list just for these integration tests.
        process.env.HTTP_SECURITY_CHECK = 'false'
        // The wrapper now defaults to HTTPS-only (Task 5). The mock server is
        // plain http on a loopback port, so opt in to insecure http for the
        // duration of these tests.
        process.env.A2A_ALLOW_INSECURE_HTTP = 'true'

        const { app, setUrl } = createMockA2AServer()
        server = app.listen(0, () => {
            const addr = server.address() as import('net').AddressInfo
            serverUrl = `http://127.0.0.1:${addr.port}`
            setUrl(serverUrl)
            done()
        })
    })

    afterAll(async () => {
        multiTurnState.clear()
        if (ORIG_HTTP_SECURITY_CHECK === undefined) {
            delete process.env.HTTP_SECURITY_CHECK
        } else {
            process.env.HTTP_SECURITY_CHECK = ORIG_HTTP_SECURITY_CHECK
        }
        if (ORIG_ALLOW_INSECURE_HTTP === undefined) {
            delete process.env.A2A_ALLOW_INSECURE_HTTP
        } else {
            process.env.A2A_ALLOW_INSECURE_HTTP = ORIG_ALLOW_INSECURE_HTTP
        }
        await closeServer(server)
    })

    // Scenario 1: Sync message/send with echo skill
    it('1: sync message/send with echo skill — full round-trip', async () => {
        const wrapper = new A2AClientWrapper(baseConfig())
        const response = await wrapper.sendMessage('Hello world', { skillId: 'echo' })

        expect(response.state).toBe('completed')
        expect(response.responseText).toContain('Hello world')
        expect(response.taskId).toBeTruthy()
        expect(response.contextId).toBeTruthy()
        expect(response.requiresInput).toBe(false)
    })

    // Scenario 2: Streaming message/stream with echo skill
    it('2: streaming message/stream with echo skill — events arrive in order', async () => {
        const wrapper = new A2AClientWrapper(baseConfig())
        const events: any[] = []

        for await (const event of wrapper.sendMessageStream('Streaming test', { skillId: 'echo' })) {
            events.push(event)
        }

        expect(events.length).toBeGreaterThanOrEqual(2)

        const statusEvents = events.filter((e) => e.type === 'status')
        const artifactEvents = events.filter((e) => e.type === 'artifact')
        const completedEvents = events.filter((e) => e.type === 'completed')

        expect(statusEvents.length).toBeGreaterThanOrEqual(1)
        expect(artifactEvents.length).toBeGreaterThanOrEqual(1)
        expect(completedEvents.length).toBe(1)

        const artifactText = artifactEvents.map((e) => e.data.text).join('')
        expect(artifactText).toContain('Streaming test')
    })

    // Scenario 3: Multi-turn — first call → input-required, second call → completed
    it('3: multi-turn — input-required then completed with taskId/contextId continuity', async () => {
        const wrapper1 = new A2AClientWrapper(baseConfig())
        const first = await wrapper1.sendMessage('multi-turn start', { skillId: 'multi-turn' })

        expect(first.state).toBe('input-required')
        expect(first.requiresInput).toBe(true)
        expect(first.taskId).toBeTruthy()
        expect(first.contextId).toBeTruthy()
        expect(first.responseText).toContain('Please provide more details')

        // Second call with stored taskId/contextId
        const wrapper2 = new A2AClientWrapper(baseConfig())
        const second = await wrapper2.sendMessage('Here are the details', {
            skillId: 'multi-turn',
            taskId: first.taskId,
            contextId: first.contextId
        })

        expect(second.state).toBe('completed')
        expect(second.requiresInput).toBe(false)
        expect(second.responseText).toContain('Completed with: Here are the details')
    })

    // Scenario 4: Timeout with slow skill
    it('4: timeout with slow skill — request aborted after configured timeout', async () => {
        const wrapper = new A2AClientWrapper(baseConfig({ timeout: 1000 }))
        await expect(wrapper.sendMessage('slow task', { skillId: 'slow' })).rejects.toThrow(/timed out/)
    }, 10000)

    // Scenario 7: Invalid Agent Card URL
    it('7: invalid Agent Card URL — descriptive error thrown', async () => {
        const wrapper = new A2AClientWrapper(baseConfig({ agentCardUrl: 'http://127.0.0.1:1' }))
        await expect(wrapper.fetchAgentCard()).rejects.toThrow(/Failed to fetch A2A Agent Card/)
    })

    // Scenario 8: Agent Card at bare URL
    it('8: agent card at bare URL — /.well-known/agent.json is appended correctly', async () => {
        const wrapper = new A2AClientWrapper(baseConfig({ agentCardUrl: serverUrl }))
        const card = await wrapper.fetchAgentCard()

        expect(card.name).toBe('Integration Test Agent')
        expect(card.skills).toHaveLength(3)
        expect(card.skills.map((s: any) => s.id)).toEqual(['echo', 'multi-turn', 'slow'])
    })
})

// ---------------------------------------------------------------------------
// Auth integration tests — separate servers with auth requirements
// ---------------------------------------------------------------------------

describe('A2AClientWrapper integration tests — auth', () => {
    let apiKeyServer: http.Server
    let apiKeyUrl: string
    let bearerServer: http.Server
    let bearerUrl: string

    const TEST_API_KEY = 'test-secret-key-12345'
    const TEST_BEARER_TOKEN = 'bearer-tok-abc'

    const ORIG_HTTP_SECURITY_CHECK = process.env.HTTP_SECURITY_CHECK
    const ORIG_ALLOW_INSECURE_HTTP = process.env.A2A_ALLOW_INSECURE_HTTP

    beforeAll((done) => {
        // Allow secureFetch to reach the loopback mock servers for these tests.
        process.env.HTTP_SECURITY_CHECK = 'false'
        // Wrapper defaults to HTTPS-only (Task 5); permit http:// for loopback.
        process.env.A2A_ALLOW_INSECURE_HTTP = 'true'

        const apiKeyMock = createMockA2AServer({ requireApiKey: TEST_API_KEY })
        apiKeyServer = apiKeyMock.app.listen(0, () => {
            const addr = apiKeyServer.address() as import('net').AddressInfo
            apiKeyUrl = `http://127.0.0.1:${addr.port}`
            apiKeyMock.setUrl(apiKeyUrl)

            const bearerMock = createMockA2AServer({ requireBearerToken: TEST_BEARER_TOKEN })
            bearerServer = bearerMock.app.listen(0, () => {
                const bAddr = bearerServer.address() as import('net').AddressInfo
                bearerUrl = `http://127.0.0.1:${bAddr.port}`
                bearerMock.setUrl(bearerUrl)
                done()
            })
        })
    })

    afterAll(async () => {
        if (ORIG_HTTP_SECURITY_CHECK === undefined) {
            delete process.env.HTTP_SECURITY_CHECK
        } else {
            process.env.HTTP_SECURITY_CHECK = ORIG_HTTP_SECURITY_CHECK
        }
        if (ORIG_ALLOW_INSECURE_HTTP === undefined) {
            delete process.env.A2A_ALLOW_INSECURE_HTTP
        } else {
            process.env.A2A_ALLOW_INSECURE_HTTP = ORIG_ALLOW_INSECURE_HTTP
        }
        await closeServer(apiKeyServer)
        await closeServer(bearerServer)
    })

    // Scenario 5: Auth — API key
    it('5: API key auth — mock server verifies custom header, rejects without it', async () => {
        // Without key → should fail
        const wrapperNoAuth = new A2AClientWrapper({
            agentCardUrl: apiKeyUrl
        })
        await expect(wrapperNoAuth.sendMessage('Hello')).rejects.toThrow(/authentication failed|Unauthorized|401/)

        // With correct key → should succeed
        const wrapperWithKey = new A2AClientWrapper({
            agentCardUrl: apiKeyUrl,
            authType: 'apiKey',
            apiKey: TEST_API_KEY,
            apiKeyHeaderName: 'X-API-Key'
        })
        const response = await wrapperWithKey.sendMessage('Hello with key', { skillId: 'echo' })
        expect(response.state).toBe('completed')
        expect(response.responseText).toContain('Hello with key')
    })

    // Scenario 6: Auth — bearer token
    it('6: bearer token auth — mock server verifies Authorization header', async () => {
        // Without token → should fail
        const wrapperNoAuth = new A2AClientWrapper({
            agentCardUrl: bearerUrl
        })
        await expect(wrapperNoAuth.sendMessage('Hello')).rejects.toThrow(/authentication failed|Unauthorized|401/)

        // With correct token → should succeed
        const wrapperWithToken = new A2AClientWrapper({
            agentCardUrl: bearerUrl,
            authType: 'bearer',
            bearerToken: TEST_BEARER_TOKEN
        })
        const response = await wrapperWithToken.sendMessage('Hello with bearer', { skillId: 'echo' })
        expect(response.state).toBe('completed')
        expect(response.responseText).toContain('Hello with bearer')
    })
})
