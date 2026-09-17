import request from 'supertest'

const mockFindChatflow = jest.fn()
const mockDataSource = { getRepository: () => ({ findOneBy: mockFindChatflow }) }

// Keep the application route, controller, service, and Express requests real;
// replace startup services unrelated to agent discovery.
jest.mock('global-agent/bootstrap', () => ({}))
jest.mock('@bull-board/express', () => ({}))
jest.mock('./DataSource', () => ({ getDataSource: () => mockDataSource }))
jest.mock('./IdentityManager', () => ({}))
jest.mock('./NodesPool', () => ({}))
jest.mock('./CachePool', () => ({}))
jest.mock('./UsageCacheManager', () => ({}))
jest.mock('./queue/QueueManager', () => ({}))
jest.mock('./schedule/ScheduleBeat', () => ({}))
jest.mock('./queue/RedisEventSubscriber', () => ({}))
jest.mock('./services/webhook-listener', () => ({}))
jest.mock('./metrics/OpenTelemetry', () => ({}))
jest.mock('./metrics/Prometheus', () => ({}))
jest.mock('./utils/SSEStreamer', () => ({}))
jest.mock('./utils/telemetry', () => ({}))
jest.mock('./utils/rateLimit', () => ({}))
jest.mock('./utils/validateKey', () => ({}))
jest.mock('./enterprise/utils/authSecrets', () => ({}))
jest.mock('./enterprise/middleware/passport', () => ({ initializeJwtCookieMiddleware: async () => {} }))
jest.mock('./routes', () => ({ __esModule: true, default: require('express').Router() }))
jest.mock('./utils', () => ({ getNodeModulesPackagePath: () => __dirname }))
jest.mock('./utils/logger', () => ({
    __esModule: true,
    default: { debug: jest.fn(), error: jest.fn(), info: jest.fn() },
    expressRequestLogger: (_req: any, _res: any, next: () => void) => next()
}))
jest.mock('./utils/XSS', () => ({
    validateCorsConfig: () => {},
    getCorsOptions: () => ({}),
    getIframeSecurityHeaders: () => ({}),
    sanitizeMiddleware: (_req: any, _res: any, next: () => void) => next()
}))
jest.mock('./utils/buildChatflow', () => ({}))
jest.mock('./utils/constants', () => ({ API_KEY_BLACKLIST_URLS: [], WHITELIST_URLS: [] }))
jest.mock('./utils/getRunningExpressApp', () => ({ getRunningExpressApp: () => ({ AppDataSource: mockDataSource }) }))

import { App } from './index'

describe('A2A well-known agent discovery', () => {
    let server: App

    beforeAll(async () => {
        server = new App()
        server.identityManager = { initializeSSO: async () => {} } as any
        await server.config()
    })

    beforeEach(() => {
        mockFindChatflow.mockResolvedValue({ id: 'flow-1', name: 'Example agent', type: 'AGENTFLOW' })
    })

    it('retains request header helpers when forwarding discovery to the controller', async () => {
        const response = await request(server.app)
            .get('/.well-known/agent-card.json?chatflowId=flow-1')
            .set('Host', 'agents.example.test')
            .set('X-Forwarded-Proto', 'https')
        expect({ status: response.status, error: response.body.error }).toEqual({ status: 200, error: undefined })
        expect(response.body.name).toBe('Example agent')
        expect(response.body.url).toBe('https://agents.example.test/api/v1/a2a/flow-1')
        expect(mockFindChatflow).toHaveBeenCalledWith({ id: 'flow-1' })
    })

    it('keeps the missing chatflow query response', async () => {
        const response = await request(server.app).get('/.well-known/agent-card.json')
        expect(response.status).toBe(400)
        expect(response.body.error).toContain('chatflowId query parameter is required')
    })
})
