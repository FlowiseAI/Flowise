/**
 * Unit tests for MCP endpoint router (packages/server/src/routes/mcp-endpoint/index.ts)
 *
 * Covers:
 *  - Body size limit: payloads > 1 MiB are rejected with 413; payloads ≤ 1 MiB pass through.
 *  - CORS behaviour under three MCP_CORS_ORIGINS configurations:
 *      • unset  – non-browser (no Origin) allowed; browser Origin blocked (no ACAO header)
 *      • '*'    – all origins allowed; cors echoes request origin as ACAO (origin: true behaviour)
 *      • list   – only listed origins get ACAO header; unlisted origins are silently blocked
 *
 * Note on cors blocking: the `cors` npm package never returns 403 for blocked origins.
 * It omits the Access-Control-Allow-Origin (ACAO) header and calls next(), letting the
 * browser enforce the policy client-side. Tests therefore assert on the presence/absence
 * of the ACAO header rather than on a 403 status code.
 */
import express, { Request, Response } from 'express'
import request from 'supertest'

// ---------------------------------------------------------------------------
// Mock the controller so no real service / DB / rate-limiter code runs.
// Each handler simply calls next() or sends 200 so we can focus on the
// middleware under test (body-size limit and CORS).
// jest.resetModules() preserves jest.mock() factory registrations, so this
// single top-level mock is picked up by every fresh require('./index').
// ---------------------------------------------------------------------------
jest.mock('../../controllers/mcp-endpoint', () => ({
    __esModule: true,
    default: {
        getRateLimiterMiddleware: (_req: Request, _res: Response, next: () => void) => next(),
        authenticateToken: (_req: Request, _res: Response, next: () => void) => next(),
        handlePost: (_req: Request, res: Response) => res.status(200).json({ ok: true }),
        handleGet: (_req: Request, res: Response) => res.status(200).end(),
        handleSseMessage: (_req: Request, res: Response) => res.status(200).json({ ok: true }),
        handleDelete: (_req: Request, res: Response) => res.status(200).json({ ok: true })
    }
}))

// ---------------------------------------------------------------------------
// Helper: build a fresh Express app with a freshly-required router so that
// process.env changes between describe blocks are picked up.
// MCP_CORS_ORIGINS is read at module-load time, so the module must be
// re-required after every env change.
// ---------------------------------------------------------------------------
function buildApp(): express.Application {
    jest.resetModules()
    const mcpRouter = require('./index').default
    const app = express()
    app.use('/mcp', mcpRouter)
    return app
}

// ---------------------------------------------------------------------------
// Body size limit
// Express uses the `bytes` package where '1mb' = 1,048,576 bytes (binary MiB).
// ---------------------------------------------------------------------------
describe('body size limit', () => {
    let app: express.Application

    beforeAll(() => {
        delete process.env.MCP_CORS_ORIGINS
        app = buildApp()
    })

    it('accepts a payload just under 1 MiB (500 KB)', async () => {
        const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { data: 'x'.repeat(500_000) } })
        const res = await request(app).post('/mcp/test-flow').set('Content-Type', 'application/json').send(payload)

        expect(res.status).not.toBe(413)
    })

    it('rejects a payload over 1 MiB (2 MB) with 413', async () => {
        const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { data: 'x'.repeat(2_000_000) } })
        const res = await request(app).post('/mcp/test-flow').set('Content-Type', 'application/json').send(payload)

        expect(res.status).toBe(413)
    })

    it('rejects a payload clearly over 1 MiB (~1.1 MB) with 413', async () => {
        // 1mb in Express (bytes package) = 1,048,576 bytes; 1,100,000 bytes of data
        // produces a JSON body well above that threshold.
        const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { data: 'x'.repeat(1_100_000) } })
        const res = await request(app).post('/mcp/test-flow').set('Content-Type', 'application/json').send(payload)

        expect(res.status).toBe(413)
    })
})

// ---------------------------------------------------------------------------
// CORS — MCP_CORS_ORIGINS unset
// origin callback: allow when no Origin header (desktop clients), block otherwise.
// When blocked, cors calls next() without setting ACAO; the handler still runs
// and returns 200, but the browser enforces the block on the missing header.
// ---------------------------------------------------------------------------
describe('CORS — MCP_CORS_ORIGINS unset', () => {
    let app: express.Application

    beforeAll(() => {
        delete process.env.MCP_CORS_ORIGINS
        app = buildApp()
    })

    it('allows requests with no Origin header (desktop / server-to-server clients)', async () => {
        const res = await request(app)
            .post('/mcp/test-flow')
            .set('Content-Type', 'application/json')
            .send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))

        expect(res.status).toBe(200)
    })

    it('does not set ACAO header for browser requests (unlisted origin)', async () => {
        const res = await request(app)
            .post('/mcp/test-flow')
            .set('Content-Type', 'application/json')
            .set('Origin', 'https://evil.example.com')
            .send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))

        // cors calls next() without ACAO; browser would block based on header absence
        expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('does not set ACAO header for preflight from browser origin', async () => {
        const res = await request(app)
            .options('/mcp/test-flow')
            .set('Origin', 'https://evil.example.com')
            .set('Access-Control-Request-Method', 'POST')

        // cors calls next() → Express default OPTIONS handler responds (no cors headers)
        expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// CORS — MCP_CORS_ORIGINS=*
// Configured as origin: true, which causes cors to echo the request Origin
// back as ACAO (not the literal string '*').
// ---------------------------------------------------------------------------
describe('CORS — MCP_CORS_ORIGINS=*', () => {
    let app: express.Application

    beforeAll(() => {
        process.env.MCP_CORS_ORIGINS = '*'
        app = buildApp()
    })

    afterAll(() => {
        delete process.env.MCP_CORS_ORIGINS
    })

    it('allows any browser origin and echoes it as ACAO', async () => {
        const res = await request(app)
            .post('/mcp/test-flow')
            .set('Content-Type', 'application/json')
            .set('Origin', 'https://any.example.com')
            .send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))

        expect(res.status).toBe(200)
        // origin: true → cors echoes the request origin (not the literal string '*')
        expect(res.headers['access-control-allow-origin']).toBe('https://any.example.com')
    })

    it('responds to preflight with 204 and echoes origin as ACAO', async () => {
        const res = await request(app)
            .options('/mcp/test-flow')
            .set('Origin', 'https://any.example.com')
            .set('Access-Control-Request-Method', 'POST')

        expect(res.status).toBe(204)
        expect(res.headers['access-control-allow-origin']).toBe('https://any.example.com')
    })
})

// ---------------------------------------------------------------------------
// CORS — MCP_CORS_ORIGINS=specific list
// ---------------------------------------------------------------------------
describe('CORS — MCP_CORS_ORIGINS specific list', () => {
    let app: express.Application

    beforeAll(() => {
        process.env.MCP_CORS_ORIGINS = 'https://allowed.example.com, https://also-allowed.example.com'
        app = buildApp()
    })

    afterAll(() => {
        delete process.env.MCP_CORS_ORIGINS
    })

    // NOTE: ACAO Header - Access-Control-Allow-Origin: <url>
    it('allows a listed origin and sets ACAO to that origin', async () => {
        const res = await request(app)
            .post('/mcp/test-flow')
            .set('Content-Type', 'application/json')
            .set('Origin', 'https://allowed.example.com')
            .send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))

        expect(res.status).toBe(200)
        expect(res.headers['access-control-allow-origin']).toBe('https://allowed.example.com')
    })

    it('allows the second listed origin and sets ACAO to that origin', async () => {
        const res = await request(app)
            .post('/mcp/test-flow')
            .set('Content-Type', 'application/json')
            .set('Origin', 'https://also-allowed.example.com')
            .send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))

        expect(res.status).toBe(200)
        expect(res.headers['access-control-allow-origin']).toBe('https://also-allowed.example.com')
    })

    it('does not set ACAO header for an unlisted origin', async () => {
        const res = await request(app)
            .post('/mcp/test-flow')
            .set('Content-Type', 'application/json')
            .set('Origin', 'https://evil.example.com')
            .send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))

        // cors omits ACAO for rejected origins; browser blocks client-side
        expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('responds to preflight with 204 and ACAO for a listed origin', async () => {
        const res = await request(app)
            .options('/mcp/test-flow')
            .set('Origin', 'https://allowed.example.com')
            .set('Access-Control-Request-Method', 'POST')

        expect(res.status).toBe(204)
        expect(res.headers['access-control-allow-origin']).toBe('https://allowed.example.com')
    })

    it('does not set ACAO header for preflight from an unlisted origin', async () => {
        const res = await request(app)
            .options('/mcp/test-flow')
            .set('Origin', 'https://evil.example.com')
            .set('Access-Control-Request-Method', 'POST')

        // cors still handles the OPTIONS and responds 204 (array-based origin),
        // but does not set ACAO since the origin is not in the allow-list
        expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })
})
