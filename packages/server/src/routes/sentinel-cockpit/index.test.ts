import express from 'express'
import http from 'http'
import net from 'net'
import request from 'supertest'
import * as classifyBridge from '../../controllers/sentinel-cockpit/classify.bridge'
import * as resumeBridge from '../../controllers/sentinel-cockpit/resume.bridge'
import sentinelCockpitRouter from '.'

const mount = '/sentinel-cockpit/v1'
const snapshotPath = `${mount}/snapshot`
const planDecisionPath = `${mount}/plan-decision`
const manualPacketPath = `${mount}/manual-worker-packet`
const resultReviewPath = `${mount}/result-review`
const ideWorkActionPath = `${mount}/ide-work-action`
const ideWorkStatusPath = `${mount}/ide-work-status`
const host = '127.0.0.1:3000'
const origin = 'http://127.0.0.1:3000'

function buildApp(): express.Application {
    const app = express()
    app.use(mount, sentinelCockpitRouter)
    app.use((_req, res) => res.status(599).type('text/html').send('<html>global fallback</html>'))
    return app
}

function validBody(overrides: Record<string, unknown> = {}) {
    return {
        request_kind: 'goal',
        plain_goal: 'audit this repo',
        ...overrides
    }
}

function validServerIdePreview() {
    return {
        status_label: 'Backend preview ready',
        workflow_label: 'Safe planning workflow',
        persona_label: 'Planning reviewer',
        skill_label: 'Plain-English planning',
        summary: 'Sentinel can preview a safe planning path.',
        what_can_happen_next: 'Sentinel can show labels before any backend work is approved.',
        what_will_not_happen: 'No files change and no backend work starts.',
        approval_copy: 'Backend work would require a separate reviewed approval step.',
        expires_at_label: 'No preview timer'
    }
}

function validPatchReviewPacket(overrides: Record<string, unknown> = {}) {
    return {
        schema_version: 'sentinel.qvc.ide_work_patch_review_packet.v1',
        review_mode: 'metadata_only',
        packet_retained: true,
        review_packet_status: 'metadata_only',
        changed_file_count: 2,
        added_line_count: 8,
        deleted_line_count: 3,
        diff_bytes: 512,
        retention_label: 'Retained briefly for review only.',
        ...overrides
    }
}

function validPatchServerIdeWork(overrides: Record<string, unknown> = {}) {
    return {
        schema_version: 'sentinel.qvc.ide_work_result_patch_review_required.v1',
        status: 'ok',
        state: 'patch_review_required',
        status_label: 'Patch proposal needs review',
        workflow_label: 'Safe review workflow',
        persona_label: 'Review helper',
        skill_label: 'Safe review',
        short_summary: 'Sentinel prepared a proposal for review only.',
        current_safe_step: 'Review the proposal outside this page before doing anything else.',
        what_can_happen_next: 'Sentinel can show review-only status for the operator.',
        what_will_not_happen: 'Nothing was accepted, applied, changed, or continued from this page.',
        approval_available: false,
        cancel_available: false,
        review_required_note: 'Review is required before anything can be accepted.',
        terminal_note: 'Nothing was accepted or applied here.',
        allowed_user_actions: ['none'],
        blocked_actions: ['No controls are available here.', 'No changes start from this page.'],
        safe_error: null,
        patch_review_packet: null,
        ...overrides
    }
}

describe('sentinel cockpit router', () => {
    let app: express.Application

    beforeEach(() => {
        app = buildApp()
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('returns a static manual-only snapshot for the exact local POST', async () => {
        const res = await request(app)
            .post(snapshotPath)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send(validBody())

        expect(res.status).toBe(200)
        expect(res.headers['content-type']).toMatch(/^application\/json/)
        expect(res.headers['cache-control']).toBe('no-store')
        expect(res.body.schema_version).toBe('sentinel.cockpit_bridge.snapshot.v1')
        expect(res.body.status).toBe('ok')
        expect(res.body.worker_status).toBe('none')
    })

    it('serves resume through the existing snapshot route only', async () => {
        jest.spyOn(resumeBridge, 'resumeBridgeIsRequested').mockReturnValue(false)
        const res = await request(app)
            .post(snapshotPath)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send({
                request_kind: 'resume',
                checkpoint_ref: 'checkpoint_123'
            })

        expect(res.status).toBe(200)
        expect(res.body.schema_version).toBe('sentinel.cockpit_bridge.snapshot.v1')
        expect(res.body.status).toBe('ok')
        expect(res.body.snapshot_ref).toBe('snapshot_manual_only')
        expect(res.body.allowed_user_actions).toEqual(['none'])
    })

    it('can return reduced IDE preview only through the existing snapshot route', async () => {
        jest.spyOn(classifyBridge, 'classifyBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'createClassifySnapshot').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.snapshot.v1',
            status: 'ok',
            snapshot_ref: 'snapshot_goal_classify_display',
            state: 'goal_classified',
            plain_summary: 'Sentinel classified this goal for intake. Planning remains deferred, and no file changes were made.',
            next_safe_action: 'planning_deferred',
            allowed_user_actions: ['none'],
            blocked_actions: ['Plan approval is not available here.', 'Execution is not available here.'],
            checkpoint_ref: null,
            evidence_refs: [],
            manual_handoff_preview: null,
            worker_status: 'none',
            result_status: 'not_started',
            shield_summary: 'not_reviewed',
            accepted_state: 'not_accepted',
            stale_doc_warning: 'none',
            ide_preview: validServerIdePreview()
        } as any)

        const res = await request(app)
            .post(snapshotPath)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send(validBody({ plain_goal: 'plan safely' }))

        expect(res.status).toBe(200)
        expect(res.body.ide_preview).toEqual(validServerIdePreview())
        const serializedPreview = JSON.stringify(res.body.ide_preview)
        expect(res.text).not.toContain('sentinel.qvc.ide_preview.v1')
        expect(serializedPreview).not.toContain('allowed_user_actions')
        expect(serializedPreview).not.toContain('approval_required')
        expect(serializedPreview).not.toContain('blocked_reason')
    })

    it('keeps classify errors route-local without raw goal or gateway detail', async () => {
        jest.spyOn(classifyBridge, 'classifyBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'createClassifySnapshot').mockRejectedValue(
            Object.assign(new Error('raw gateway detail should not leak'), {
                statusCode: 503,
                code: 'sentinel_classify_unavailable'
            })
        )
        const res = await request(app)
            .post(snapshotPath)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send({
                request_kind: 'goal',
                plain_goal: 'classify this local goal'
            })

        expect(res.status).toBe(503)
        expect(res.headers['content-type']).toMatch(/^application\/json/)
        expect(res.body.schema_version).toBe('sentinel.cockpit_bridge.error.v1')
        expect(res.body.status).toBe('error')
        expect(res.body.error.code).toBe('sentinel_classify_unavailable')
        expect(res.text).not.toContain('ide_preview')
        expect(res.text).not.toContain('classify this local goal')
        expect(res.text).not.toContain('raw gateway detail')
        expect(res.text).not.toContain('<html>')
    })

    it('does not expose a separate resume route', async () => {
        const res = await request(app)
            .post(`${mount}/resume`)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send({
                request_kind: 'resume',
                checkpoint_ref: 'checkpoint_123'
            })

        expect(res.status).toBe(404)
        expect(res.headers['content-type']).toMatch(/^application\/json/)
        expect(res.body.schema_version).toBe('sentinel.cockpit_bridge.error.v1')
        expect(res.body.status).toBe('error')
    })

    it('keeps plan-decision errors route-local without raw identifiers', async () => {
        const res = await request(app)
            .post(planDecisionPath)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send({
                request_kind: 'plan_decision',
                cockpit_ref: 'cockpit_abcdefghijklmnopqrstuvwx',
                client_nonce: 'nonce_abcdefghijklmnop',
                decision: 'approve_plan'
            })

        expect(res.status).toBe(403)
        expect(res.headers['content-type']).toMatch(/^application\/json/)
        expect(res.body.schema_version).toBe('sentinel.cockpit_bridge.error.v1')
        expect(res.body.status).toBe('error')
        expect(res.body.error.code).toBe('feature_disabled')
        expect(res.text).not.toContain('ide_preview')
        expect(res.text).not.toContain('cockpit_abcdefghijklmnopqrstuvwx')
        expect(res.text).not.toContain('nonce_abcdefghijklmnop')
        expect(res.text).not.toContain('<html>')
    })

    it('keeps manual-packet errors route-local without raw authority values', async () => {
        const res = await request(app)
            .post(manualPacketPath)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send({
                request_kind: 'manual_worker_packet',
                cockpit_ref: 'cockpit_abcdefghijklmnopqrstuvwx',
                client_nonce: 'nonce_abcdefghijklmnop'
            })

        expect(res.status).toBe(403)
        expect(res.headers['content-type']).toMatch(/^application\/json/)
        expect(res.body.schema_version).toBe('sentinel.cockpit_bridge.error.v1')
        expect(res.body.status).toBe('error')
        expect(res.body.error.code).toBe('feature_disabled')
        expect(res.text).not.toContain('ide_preview')
        expect(res.text).not.toContain('cockpit_abcdefghijklmnopqrstuvwx')
        expect(res.text).not.toContain('nonce_abcdefghijklmnop')
        expect(res.text).not.toContain('<html>')
    })

    it('keeps result-review errors route-local without raw authority or pasted values', async () => {
        const res = await request(app)
            .post(resultReviewPath)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send({
                request_kind: 'result_review',
                cockpit_ref: 'cockpit_abcdefghijklmnopqrstuvwx',
                client_nonce: 'nonce_abcdefghijklmnop',
                result_text: 'Manual worker result text was reviewed outside this page.',
                review_only_confirmation: true
            })

        expect(res.status).toBe(403)
        expect(res.headers['content-type']).toMatch(/^application\/json/)
        expect(res.body.schema_version).toBe('sentinel.cockpit_bridge.error.v1')
        expect(res.body.status).toBe('error')
        expect(res.body.error.code).toBe('feature_disabled')
        expect(res.text).not.toContain('ide_preview')
        expect(res.text).not.toContain('cockpit_abcdefghijklmnopqrstuvwx')
        expect(res.text).not.toContain('nonce_abcdefghijklmnop')
        expect(res.text).not.toContain('Manual worker result text')
        expect(res.text).not.toContain('<html>')
    })

    it('serves display-only patch review status and accepts only exact patch action route request', async () => {
        const patchIdeWork = validPatchServerIdeWork({ patch_review_packet: validPatchReviewPacket() })
        const statusSpy = jest.spyOn(classifyBridge, 'createIdeWorkStatusSession').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.ide_work.v1',
            status: 'ok',
            ide_work: patchIdeWork as any,
            safe_error: null
        })
        const actionSpy = jest.spyOn(classifyBridge, 'createIdeWorkActionSession').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.ide_work.v1',
            status: 'ok',
            ide_work: patchIdeWork as any,
            safe_error: null
        })

        const statusRes = await request(app)
            .post(ideWorkStatusPath)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send({ request_kind: 'ide_work_status' })

        expect(statusSpy).toHaveBeenCalledWith({ request_kind: 'ide_work_status' })
        expect(statusRes.status).toBe(200)
        expect(statusRes.body.ide_work).toEqual(patchIdeWork)
        expect(statusRes.text).not.toContain('request_patch_proposal')
        expect(statusRes.text).not.toMatch(/diff_text|source code|file path|raw output|stdout|stderr/i)

        const actionRes = await request(app)
            .post(ideWorkActionPath)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send({ request_kind: 'ide_work_action', action: 'request_patch_proposal' })

        expect(actionRes.status).toBe(200)
        expect(actionSpy).toHaveBeenCalledWith({ request_kind: 'ide_work_action', action: 'request_patch_proposal' })
        expect(actionRes.body.ide_work).toEqual(patchIdeWork)
        expect(actionRes.text).not.toMatch(/diff_text|source code|file path|raw output|stdout|stderr/i)

        actionSpy.mockClear()
        const extraKeyRes = await request(app)
            .post(ideWorkActionPath)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send({ request_kind: 'ide_work_action', action: 'request_patch_proposal', workspace: 'hidden' })

        expect(extraKeyRes.status).toBe(400)
        expect(extraKeyRes.body.error.code).toBe('ide_work_invalid_input')
        expect(actionSpy).not.toHaveBeenCalled()
    })

    it.each([
        ['OPTIONS', () => request(app).options(snapshotPath).set('Host', host).set('Origin', origin)],
        ['GET', () => request(app).get(snapshotPath).set('Host', host).set('Origin', origin)],
        [
            'wrong path',
            () =>
                request(app)
                    .post(`${mount}/wrong`)
                    .set('Host', host)
                    .set('Origin', origin)
                    .set('Content-Type', 'application/json')
                    .send(validBody())
        ],
        [
            'bad origin',
            () =>
                request(app)
                    .post(snapshotPath)
                    .set('Host', host)
                    .set('Origin', 'http://127.0.0.1:3001')
                    .set('Content-Type', 'application/json')
                    .send(validBody())
        ],
        [
            'missing origin',
            () => request(app).post(snapshotPath).set('Host', host).set('Content-Type', 'application/json').send(validBody())
        ],
        [
            'bad host',
            () =>
                request(app)
                    .post(snapshotPath)
                    .set('Host', 'localhost:3000')
                    .set('Origin', origin)
                    .set('Content-Type', 'application/json')
                    .send(validBody())
        ],
        [
            'bad content type',
            () =>
                request(app)
                    .post(snapshotPath)
                    .set('Host', host)
                    .set('Origin', origin)
                    .set('Content-Type', 'text/plain')
                    .send(JSON.stringify(validBody()))
        ],
        [
            'bad content encoding',
            () =>
                request(app)
                    .post(snapshotPath)
                    .set('Host', host)
                    .set('Origin', origin)
                    .set('Content-Type', 'application/json')
                    .set('Content-Encoding', 'gzip')
                    .send(validBody())
        ],
        [
            'forbidden field',
            () =>
                request(app)
                    .post(snapshotPath)
                    .set('Host', host)
                    .set('Origin', origin)
                    .set('Content-Type', 'application/json')
                    .send(validBody({ token: 'blocked' }))
        ]
    ])('returns route-local JSON for %s', async (_label, runRequest) => {
        const res = await runRequest()

        expect(res.status).not.toBe(599)
        expect(res.headers['content-type']).toMatch(/^application\/json/)
        expect(res.text).not.toContain('<html>')
        expect(res.body.schema_version).toBe('sentinel.cockpit_bridge.error.v1')
        expect(res.body.status).toBe('error')
    })

    it('rejects malformed JSON with a closed route-local error', async () => {
        const res = await request(app)
            .post(snapshotPath)
            .set('Host', host)
            .set('Origin', origin)
            .set('Content-Type', 'application/json')
            .send('{"request_kind":')

        expect(res.status).toBe(400)
        expect(res.headers['content-type']).toMatch(/^application\/json/)
        expect(res.body.schema_version).toBe('sentinel.cockpit_bridge.error.v1')
        expect(res.text).not.toContain('<html>')
    })

    it('rejects duplicate raw Origin headers through an in-process raw HTTP harness', async () => {
        const body = '{"request_kind":"goal","plain_goal":"audit this repo"}'
        const response = await rawRequest(
            buildApp(),
            [
                'POST /sentinel-cockpit/v1/snapshot HTTP/1.1',
                `Host: ${host}`,
                `Origin: ${origin}`,
                `Origin: ${origin}`,
                'Content-Type: application/json',
                `Content-Length: ${Buffer.byteLength(body)}`,
                '',
                body
            ].join('\r\n')
        )

        expect(response).toContain('HTTP/1.1 403')
        expect(response).toContain('application/json; charset=utf-8')
        expect(response).toContain('sentinel.cockpit_bridge.error.v1')
        expect(response).not.toContain('<html>')
    })
})

function rawRequest(app: express.Application, raw: string): Promise<string> {
    const server = http.createServer(app)
    return new Promise((resolve, reject) => {
        server.listen(0, '127.0.0.1', () => {
            const address = server.address()
            if (!address || typeof address === 'string') {
                reject(new Error('missing test server address'))
                return
            }
            const socket = net.createConnection(address.port, '127.0.0.1', () => {
                socket.end(raw)
            })
            let response = ''
            socket.setEncoding('utf8')
            socket.on('data', (chunk) => {
                response += chunk
            })
            socket.on('end', () => {
                server.close(() => resolve(response))
            })
            socket.on('error', (error) => {
                server.close(() => reject(error))
            })
        })
    })
}
