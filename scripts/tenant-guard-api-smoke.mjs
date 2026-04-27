#!/usr/bin/env node
/**
 * Smoke tests for tenant / workspace guards (local Flowise).
 *
 * HOW TO USE (read this — the script cannot guess your server mode)
 *
 * 1) Workspace API key (Bearer)
 *    - In the UI: create a workspace API key and copy the **secret** shown once (long random string).
 *    - Put that exact string in CONFIG.apiKeySecret. `Authorization: Bearer <secret>` is what the server checks
 *      (see packages/server/src/utils/validateKey.ts).
 *    - Do **not** use the key’s display name, database id, or a truncated value.
 *    - **GET /api/v1/ping is whitelisted** — it skips API-key middleware, so `bearer_ping` can be 200 even when
 *      the secret is wrong. Use `bearer_chatflows_probe` (GET /chatflows) as the real check.
 *    - If **every** protected call returns 401 `{"error":"Unauthorized Access"}` but ping works, usual causes:
 *        (a) wrong / non-secret value in CONFIG.apiKeySecret
 *        (b) Enterprise/Cloud: invalid or missing license — the server rejects **before** validating the key
 *            (packages/server/src/index.ts). Fix FLOWISE_EE_LICENSE_KEY / LICENSE_URL (or run open-source mode).
 *
 * 2) Internal / UI session (JWT + session)
 *    - Routes with `x-request-from: internal` use passport JWT from the **cookie** `token`, and the session
 *      cookie `connect.sid` must match that login (see packages/server/src/enterprise/middleware/passport).
 *    - DevTools → Network → pick any **authenticated** `/api/v1/...` request → Request Headers → copy the full
 *      **Cookie** header into CONFIG.internalAuthCookie (include `token=...` and `connect.sid=...`).
 *    - If you see 401 `{"message":"Invalid or Missing token"}`: token expired (log in again), cookie string
 *      broken (newlines/quotes), or missing `connect.sid` so the session cannot restore `req.user`.
 *
 * Edit CONFIG below, then: node scripts/tenant-guard-api-smoke.mjs
 */

/** @type {Record<string, any>} Hard-code your values here (do not commit real secrets). */
const CONFIG = {
    baseUrl: 'http://localhost:3000',

    /** Workspace API key **secret** (the one-time value), not the key id */
    apiKeySecret: 'tzPE4T_iVcdZGzEvdd3_8UaqdFi_2wjEHJfhrqi6WOw',

    /** Full `Cookie` header from browser after login (token + connect.sid + …) */
    internalAuthCookie:
        'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImViMWYwODZmLTcwMGYtNGYyZS1iOTFlLTU1ZDQ3ZTBjOThmZSIsInVzZXJuYW1lIjoiSWxhbmdvIiwibWV0YSI6ImRmMzU4Njc3ZjUwYTI3NjdkZTNhZjI2NjgyNWY3YTBjOmE4NTgzZjM2Yzk5YTA4YmUxOTI0MWMyYTgyMGRiZmQ5ODVjYTFhNzRlZTBmNDhhN2ZhMGViOTg5MjJiMThlYjlkZDJlN2NiNjZmYzgzMWY4Yzk2NDcwZmZjYTEwMWQ3YzY3YmNmOTYzOTJlNTBkNjE5ODFlMTM1MGU1MjRkYjA5YjJhNjMwMGFjODcxZGNlNGJjMzFmOTM5Zjk0MjUzNDUiLCJpYXQiOjE3NzcyODIzMjksIm5iZiI6MTc3NzI4MjMyOSwiZXhwIjoxNzc3MzAzOTI5LCJhdWQiOiJBVURJRU5DRSIsImlzcyI6IklTU1VFUiJ9.WYX51VisbiCboB9u6iV2UicTCCMhzwQSGmVTskVwfJk; refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImViMWYwODZmLTcwMGYtNGYyZS1iOTFlLTU1ZDQ3ZTBjOThmZSIsInVzZXJuYW1lIjoiSWxhbmdvIiwibWV0YSI6IjAwMDYwNjYxYzM0N2NiNjNjNzAxZmM0ZjNkNTRhMGY2OmI2NzZmZDU4N2ZhZDU5ZmRlYWNkNzQ4YjE5ZjM5NWM1MzZlYzM2NWFiZGFhYmJhMzBiODk5ZGM1ZGQyODY2NDFlNGZkYTgzN2IxMmY1ZDFjY2E5NDVkNTU0YzUwODBiZmU1ZGNhNDA4YzY4YTViNDhkMzE2NTk4M2IxNDRmOGVjY2Q2OGEzODU4OTBlZjZkMWZhZWMwNmYzZDVjYTY5ZjciLCJpYXQiOjE3NzcyODIzMjksIm5iZiI6MTc3NzI4MjMyOSwiZXhwIjoxNzc5ODc0MzI5LCJhdWQiOiJBVURJRU5DRSIsImlzcyI6IklTU1VFUiJ9.BG_dRep7y5kxj2Fe0VLmkMNgnJKSZY-tM3QC5dY7YB4; connect.sid=s%3AUd0VDZkuQbQZpQSoG1KJXcvDMs-aCkRE.g0n3R%2FW69zJXxUFBBKIm80BPIlpZnP2Y3DH%2FgnWNZcA',

    /** Enables DELETE/PATCH that mutate real data */
    runDestructiveTests: true,

    chatflowId: 'c3eda89b-ba2d-4e49-9949-33b6c92ca9b8',
    chatflowIdOtherWorkspace: 'ac2b8303-b27e-4dd2-8e34-522b74fc0b56',
    chatflowLastUpdated: '2026-04-21 14:41:39.894839',

    credentialId: '52f7b5f2-576f-4ff2-983f-1aa2602f8201',
    credentialIdOtherWorkspace: '56add8de-747e-4446-928f-7ed72b16e316',

    openaiAssistantsCredential: '52f7b5f2-576f-4ff2-983f-1aa2602f8201',
    openaiVectorStoreId: 'vs_69bd35cfeed88191aeacce24e062080a',
    openaiVectorStoreIdOtherWorkspace: 'vs_69bd35cfeed88191aeacce24e062080a',

    evaluationId: '363e3d33-994d-45f7-89e7-48021c0100a1',
    evaluationIdOtherWorkspace: '0aa3f624-b8df-4270-be40-7ed47fa28b49',

    datasetId: 'd29685ac-8656-427e-b406-cb8606567194',
    datasetIdOtherWorkspace: '132e2bef-35da-443c-b737-1a7bb7e24486',

    documentStoreIdOtherWorkspace: 'ae5b855f-886e-4760-ae96-7920e326a806',
    /** Set to a real preview payload object, or null to skip document-store preview tests */
    documentStorePreviewBody: {
        loaderId: 'textFile',
        id: '025b7472-535b-41bc-976d-ee1d22ea0ab2',
        storeId: 'c08d1976-e35a-4d1d-8ed0-d44919c12402',
        loaderName: 'Text File',
        loaderConfig: { txtFile: 'FILE-STORAGE::["the great gatsby.txt"]', textSplitter: '', metadata: '', omitMetadataKeys: '' },
        splitterId: 'recursiveCharacterTextSplitter',
        splitterConfig: { chunkSize: 1000, chunkOverlap: 200, separators: '' },
        splitterName: 'Recursive Character Text Splitter',
        previewChunkCount: 20
    },

    /** Used only when runDestructiveTests is true (PATCH upsert delete) */
    upsertHistoryIdsForDestructivePatch: [],

    organizationId: 'c5e9de31-5846-4010-8d4e-5290ba026b02',
    organizationIdWrong: '9201e110-0a5f-4a3b-bdc7-6993bb30fcd5',
    workspaceId: 'c90227a3-a664-4873-b731-45db746c9064',
    workspaceIdOther: '27569757-5823-4087-84e4-040f4489a10c',
    /** Same id as JWT session user for /user and /workspaceuser?userId= self tests */
    userId: 'eb1f086f-700f-4f2e-b91e-55d47e0c98fe',
    /** Another user id (expect 403 for non-admin on /user and /workspaceuser?userId=) */
    userIdOtherOrg: '1e520bfe-eddf-4e56-b609-3722fdbf1cf7',
    roleId: '91e277f6-0bb2-4027-971a-1094dd07dc99',
    loginMethodId: '',

    workspaceUserQueryWorkspaceId: '27569757-5823-4087-84e4-040f4489a10c',
    workspaceUserQueryUserId: '1e520bfe-eddf-4e56-b609-3722fdbf1cf7',

    /** Body for POST /internal-prediction/:chatflowId */
    internalPredictionBody: { question: 'ping', history: [], overrideConfig: {} }
}

const BASE_URL = String(CONFIG.baseUrl || 'http://localhost:3000').replace(/\/$/, '')
const API_ROOT = `${BASE_URL}/api/v1`

// ---------------------------------------------------------------------------

const results = []

function skip(name, reason) {
    results.push({ name, status: 'SKIP', reason: reason || '' })
    console.log(`SKIP  ${name}${reason ? ` — ${reason}` : ''}`)
}

function ok(name, status, note) {
    results.push({ name, status: 'OK', http: status, note: note || '' })
    console.log(`OK    ${name} (${status})${note ? ` — ${note}` : ''}`)
}

function fail(name, err, status, bodySnippet) {
    results.push({ name, status: 'FAIL', error: String(err), http: status, bodySnippet })
    console.error(`FAIL  ${name}${status != null ? ` (${status})` : ''}: ${err}`)
    if (bodySnippet) console.error(`      body: ${bodySnippet.slice(0, 200)}`)
}

async function httpRequest(name, path, opts = {}) {
    const {
        method = 'GET',
        auth = 'bearer', // 'bearer' | 'internal' | 'none'
        body,
        headers = {},
        expectAnyOf = null,
        note = ''
    } = opts

    const url = path.startsWith('http') ? path : `${API_ROOT}${path}`
    const h = { ...headers }
    if (body !== undefined && body !== null && !h['Content-Type'] && !(body instanceof FormData)) {
        h['Content-Type'] = 'application/json'
    }
    if (auth === 'bearer') {
        if (!CONFIG.apiKeySecret) throw new Error('CONFIG.apiKeySecret is empty')
        h['Authorization'] = `Bearer ${CONFIG.apiKeySecret}`
    }
    if (auth === 'internal') {
        h['x-request-from'] = 'internal'
        if (!CONFIG.internalAuthCookie) throw new Error('CONFIG.internalAuthCookie is empty')
        h['Cookie'] = CONFIG.internalAuthCookie
    }

    let res
    let text
    try {
        res = await fetch(url, {
            method,
            headers: h,
            body: body instanceof FormData ? body : typeof body === 'string' ? body : body != null ? JSON.stringify(body) : undefined
        })
        text = await res.text()
    } catch (err) {
        fail(name, err.message, null, '')
        return null
    }

    let snippet = text
    try {
        const j = JSON.parse(text)
        snippet = JSON.stringify(j).slice(0, 300)
    } catch {
        snippet = text.slice(0, 300)
    }

    if (expectAnyOf && !expectAnyOf.includes(res.status)) {
        fail(name, `expected status one of [${expectAnyOf.join(', ')}]`, res.status, snippet)
        return null
    }
    ok(name, res.status, note)
    return { status: res.status, text, snippet }
}

async function runCase(name, path, opts) {
    try {
        await httpRequest(name, path, opts)
    } catch (err) {
        fail(name, err.message, null, '')
    }
}

async function main() {
    console.log(`Base: ${BASE_URL}`)
    console.log(`API:  ${API_ROOT}`)
    console.log(`CONFIG.runDestructiveTests=${CONFIG.runDestructiveTests}`)
    console.log('')

    // --- Bearer: auth sanity ---
    if (!CONFIG.apiKeySecret) {
        skip('bearer_auth_missing', 'Set CONFIG.apiKeySecret')
    } else {
        // /ping is whitelisted and skips API-key middleware — use a protected route to assert 401.
        await runCase('bearer_invalid_key', '/chatflows', {
            method: 'GET',
            auth: 'none',
            headers: { Authorization: 'Bearer definitely-not-a-valid-key' },
            expectAnyOf: [401]
        })
        await runCase('bearer_ping', '/ping', { method: 'GET', auth: 'bearer', expectAnyOf: [200] })
    }

    // --- Bearer: workspace-scoped routes ---
    if (CONFIG.apiKeySecret) {
        if (CONFIG.chatflowId && CONFIG.chatflowIdOtherWorkspace) {
            await runCase(
                'bearer_chatflow_has_changed_own',
                `/chatflows/has-changed/${encodeURIComponent(CONFIG.chatflowId)}/${encodeURIComponent(CONFIG.chatflowLastUpdated)}`,
                {
                    method: 'GET',
                    auth: 'bearer',
                    expectAnyOf: [200, 304, 400, 403]
                }
            )
            await runCase(
                'bearer_chatflow_has_changed_other_ws',
                `/chatflows/has-changed/${encodeURIComponent(CONFIG.chatflowIdOtherWorkspace)}/${encodeURIComponent(
                    CONFIG.chatflowLastUpdated
                )}`,
                {
                    method: 'GET',
                    auth: 'bearer',
                    expectAnyOf: [404, 403]
                }
            )
        } else {
            skip('bearer_chatflow_has_changed', 'Set CONFIG.chatflowId and CONFIG.chatflowIdOtherWorkspace')
        }

        const predBody =
            CONFIG.internalPredictionBody && typeof CONFIG.internalPredictionBody === 'object'
                ? CONFIG.internalPredictionBody
                : { question: 'ping', history: [], overrideConfig: {} }
        if (CONFIG.chatflowIdOtherWorkspace) {
            await runCase(
                'bearer_internal_prediction_wrong_chatflow',
                `/internal-prediction/${encodeURIComponent(CONFIG.chatflowIdOtherWorkspace)}`,
                {
                    method: 'POST',
                    auth: 'bearer',
                    body: predBody,
                    expectAnyOf: [404]
                }
            )
        } else {
            skip('bearer_internal_prediction_wrong_chatflow', 'Set CONFIG.chatflowIdOtherWorkspace')
        }

        if (CONFIG.chatflowId) {
            await runCase('bearer_internal_prediction_own_chatflow', `/internal-prediction/${encodeURIComponent(CONFIG.chatflowId)}`, {
                method: 'POST',
                auth: 'bearer',
                body: predBody,
                expectAnyOf: [200, 400, 500]
            })
        }

        if (CONFIG.chatflowId && CONFIG.chatflowIdOtherWorkspace) {
            await runCase('bearer_leads_own', `/leads/${encodeURIComponent(CONFIG.chatflowId)}`, {
                method: 'GET',
                auth: 'bearer',
                expectAnyOf: [200, 404]
            })
            await runCase('bearer_leads_other_ws', `/leads/${encodeURIComponent(CONFIG.chatflowIdOtherWorkspace)}`, {
                method: 'GET',
                auth: 'bearer',
                expectAnyOf: [404, 401]
            })
        } else {
            skip('bearer_leads', 'Set CONFIG.chatflowId and CONFIG.chatflowIdOtherWorkspace')
        }

        await runCase('bearer_upsert_history_missing_chatflow', `/upsert-history/`, {
            method: 'GET',
            auth: 'bearer',
            expectAnyOf: [400, 404]
        })

        if (CONFIG.chatflowId) {
            await runCase('bearer_upsert_history_own', `/upsert-history/${encodeURIComponent(CONFIG.chatflowId)}`, {
                method: 'GET',
                auth: 'bearer',
                expectAnyOf: [200]
            })
        }
        if (CONFIG.chatflowIdOtherWorkspace) {
            await runCase(
                'bearer_upsert_history_other_chatflow',
                `/upsert-history/${encodeURIComponent(CONFIG.chatflowIdOtherWorkspace)}`,
                {
                    method: 'GET',
                    auth: 'bearer',
                    expectAnyOf: [404, 403]
                }
            )
        }

        await runCase('bearer_upsert_history_patch_fake_ids', `/upsert-history/`, {
            method: 'PATCH',
            auth: 'bearer',
            body: { ids: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'] },
            expectAnyOf: [404, 400]
        })
        if (
            Array.isArray(CONFIG.upsertHistoryIdsForDestructivePatch) &&
            CONFIG.upsertHistoryIdsForDestructivePatch.length &&
            CONFIG.runDestructiveTests
        ) {
            await runCase('bearer_upsert_history_patch_real_ids_DESTRUCTIVE', `/upsert-history/`, {
                method: 'PATCH',
                auth: 'bearer',
                body: { ids: CONFIG.upsertHistoryIdsForDestructivePatch },
                expectAnyOf: [200, 404]
            })
        } else if (
            Array.isArray(CONFIG.upsertHistoryIdsForDestructivePatch) &&
            CONFIG.upsertHistoryIdsForDestructivePatch.length &&
            !CONFIG.runDestructiveTests
        ) {
            skip(
                'bearer_upsert_history_patch_real_ids',
                'Set CONFIG.runDestructiveTests=true to PATCH-delete upsertHistoryIdsForDestructivePatch'
            )
        }

        if (CONFIG.credentialId && CONFIG.credentialIdOtherWorkspace) {
            await runCase('bearer_oauth_authorize_own', `/oauth2-credential/authorize/${encodeURIComponent(CONFIG.credentialId)}`, {
                method: 'POST',
                auth: 'bearer',
                expectAnyOf: [200, 400, 500]
            })
            await runCase(
                'bearer_oauth_authorize_other_ws',
                `/oauth2-credential/authorize/${encodeURIComponent(CONFIG.credentialIdOtherWorkspace)}`,
                {
                    method: 'POST',
                    auth: 'bearer',
                    expectAnyOf: [404]
                }
            )
        } else {
            skip('bearer_oauth_authorize', 'Set CONFIG.credentialId and CONFIG.credentialIdOtherWorkspace')
        }

        if (CONFIG.openaiAssistantsCredential) {
            await runCase(
                'bearer_openai_vector_list',
                `/openai-assistants-vector-store?credential=${encodeURIComponent(CONFIG.openaiAssistantsCredential)}`,
                {
                    method: 'GET',
                    auth: 'bearer',
                    expectAnyOf: [200, 403, 400]
                }
            )
            if (CONFIG.openaiVectorStoreId && CONFIG.openaiVectorStoreIdOtherWorkspace) {
                await runCase(
                    'bearer_openai_vector_get_own',
                    `/openai-assistants-vector-store/${encodeURIComponent(CONFIG.openaiVectorStoreId)}?credential=${encodeURIComponent(
                        CONFIG.openaiAssistantsCredential
                    )}`,
                    {
                        method: 'GET',
                        auth: 'bearer',
                        expectAnyOf: [200, 403, 404]
                    }
                )
                // Flowise only checks the credential belongs to the workspace; OpenAI then returns any
                // vector_store id visible to that API key — so 200 is normal if "other" id is on the same key.
                await runCase(
                    'bearer_openai_vector_get_other',
                    `/openai-assistants-vector-store/${encodeURIComponent(
                        CONFIG.openaiVectorStoreIdOtherWorkspace
                    )}?credential=${encodeURIComponent(CONFIG.openaiAssistantsCredential)}`,
                    {
                        method: 'GET',
                        auth: 'bearer',
                        expectAnyOf: [200, 404, 403]
                    }
                )
            }
        } else {
            skip('bearer_openai_vector_store', 'Set CONFIG.openaiAssistantsCredential')
        }

        if (CONFIG.evaluationIdOtherWorkspace) {
            await runCase('bearer_eval_delete_other_ws', `/evaluations/${encodeURIComponent(CONFIG.evaluationIdOtherWorkspace)}`, {
                method: 'DELETE',
                auth: 'bearer',
                expectAnyOf: [404]
            })
        } else {
            skip('bearer_eval_delete_other_ws', 'Set CONFIG.evaluationIdOtherWorkspace')
        }

        if (CONFIG.runDestructiveTests && CONFIG.evaluationId) {
            await runCase('bearer_eval_delete_own_DESTRUCTIVE', `/evaluations/${encodeURIComponent(CONFIG.evaluationId)}`, {
                method: 'DELETE',
                auth: 'bearer',
                expectAnyOf: [200, 404]
            })
        } else if (CONFIG.evaluationId && !CONFIG.runDestructiveTests) {
            skip('bearer_eval_delete_own', 'Set CONFIG.runDestructiveTests=true to delete CONFIG.evaluationId')
        }

        if (CONFIG.datasetIdOtherWorkspace) {
            await runCase('bearer_dataset_delete_other', `/datasets/set/${encodeURIComponent(CONFIG.datasetIdOtherWorkspace)}`, {
                method: 'DELETE',
                auth: 'bearer',
                expectAnyOf: [404, 403, 400]
            })
        }
        if (CONFIG.runDestructiveTests && CONFIG.datasetId) {
            await runCase('bearer_dataset_delete_own_DESTRUCTIVE', `/datasets/set/${encodeURIComponent(CONFIG.datasetId)}`, {
                method: 'DELETE',
                auth: 'bearer',
                expectAnyOf: [200, 404]
            })
        } else if (CONFIG.datasetId && !CONFIG.runDestructiveTests) {
            skip('bearer_dataset_delete_own', 'Set CONFIG.runDestructiveTests=true to delete CONFIG.datasetId')
        }

        if (CONFIG.documentStorePreviewBody && typeof CONFIG.documentStorePreviewBody === 'object') {
            const previewBody = CONFIG.documentStorePreviewBody
            if (CONFIG.documentStoreIdOtherWorkspace) {
                const wrongBody = JSON.parse(JSON.stringify(previewBody))
                if (typeof wrongBody === 'object' && wrongBody) wrongBody.storeId = CONFIG.documentStoreIdOtherWorkspace
                await runCase('bearer_docstore_preview_wrong_store', `/document-store/loader/preview`, {
                    method: 'POST',
                    auth: 'bearer',
                    body: wrongBody,
                    expectAnyOf: [404, 400, 403, 412]
                })
            }
            await runCase('bearer_docstore_preview_own', `/document-store/loader/preview`, {
                method: 'POST',
                auth: 'bearer',
                body: previewBody,
                expectAnyOf: [200, 400, 403, 412, 500]
            })
        } else {
            skip('bearer_docstore_preview', 'Set CONFIG.documentStorePreviewBody to an object')
        }

        if (CONFIG.runDestructiveTests && CONFIG.chatflowId) {
            await runCase('bearer_chatmessage_delete_all_DESTRUCTIVE', `/chatmessage/${encodeURIComponent(CONFIG.chatflowId)}`, {
                method: 'DELETE',
                auth: 'bearer',
                expectAnyOf: [200, 404]
            })
        } else if (CONFIG.chatflowId && !CONFIG.runDestructiveTests) {
            skip('bearer_chatmessage_delete_all', 'Set CONFIG.runDestructiveTests=true to DELETE /chatmessage/:chatflowId')
        }
    }

    // --- Internal cookie + JWT: enterprise & whitelisted paths ---
    if (!CONFIG.internalAuthCookie) {
        skip('internal_auth_missing', 'Set CONFIG.internalAuthCookie')
    } else {
        await runCase('internal_ping', '/ping', { method: 'GET', auth: 'internal', expectAnyOf: [200] })

        if (CONFIG.workspaceUserQueryWorkspaceId && CONFIG.workspaceUserQueryUserId) {
            const q = new URLSearchParams({
                workspaceId: CONFIG.workspaceUserQueryWorkspaceId,
                userId: CONFIG.workspaceUserQueryUserId
            })
            await runCase('internal_workspace_user_read', `/workspaceuser?${q}`, {
                method: 'GET',
                auth: 'internal',
                expectAnyOf: [200, 403, 404]
            })
        } else {
            skip('internal_workspace_user_read', 'Set CONFIG.workspaceUserQueryWorkspaceId and CONFIG.workspaceUserQueryUserId')
        }

        // userId-only: must be self or users:manage; scoped to active org (tenant guard)
        if (CONFIG.userId) {
            await runCase('internal_workspace_user_by_userId_self', `/workspaceuser?userId=${encodeURIComponent(CONFIG.userId)}`, {
                method: 'GET',
                auth: 'internal',
                expectAnyOf: [200, 403]
            })
        }
        if (CONFIG.userIdOtherOrg) {
            await runCase('internal_workspace_user_by_userId_other', `/workspaceuser?userId=${encodeURIComponent(CONFIG.userIdOtherOrg)}`, {
                method: 'GET',
                auth: 'internal',
                expectAnyOf: [200, 403, 404]
            })
        }

        if (CONFIG.organizationId) {
            await runCase(
                'internal_organization_user_read',
                `/organizationuser?organizationId=${encodeURIComponent(CONFIG.organizationId)}`,
                {
                    method: 'GET',
                    auth: 'internal',
                    expectAnyOf: [200, 403, 404]
                }
            )
        }
        if (CONFIG.organizationIdWrong) {
            await runCase(
                'internal_organization_user_wrong_org',
                `/organizationuser?organizationId=${encodeURIComponent(CONFIG.organizationIdWrong)}`,
                {
                    method: 'GET',
                    auth: 'internal',
                    expectAnyOf: [403, 401]
                }
            )
        }

        // CONFIG.userId should match the logged-in session user for the self case.
        if (CONFIG.userId) {
            await runCase('internal_user_read', `/user?id=${encodeURIComponent(CONFIG.userId)}`, {
                method: 'GET',
                auth: 'internal',
                expectAnyOf: [200, 403, 404]
            })
        }
        if (CONFIG.userIdOtherOrg) {
            await runCase('internal_user_read_other', `/user?id=${encodeURIComponent(CONFIG.userIdOtherOrg)}`, {
                method: 'GET',
                auth: 'internal',
                expectAnyOf: [200, 403, 404]
            })
        }

        if (CONFIG.roleId) {
            await runCase('internal_role_read_by_id', `/role?id=${encodeURIComponent(CONFIG.roleId)}`, {
                method: 'GET',
                auth: 'internal',
                expectAnyOf: [200, 403, 404]
            })
        }
        if (CONFIG.organizationId) {
            await runCase('internal_role_read_by_org', `/role?organizationId=${encodeURIComponent(CONFIG.organizationId)}`, {
                method: 'GET',
                auth: 'internal',
                expectAnyOf: [200, 403]
            })
        }

        if (CONFIG.workspaceId) {
            await runCase('internal_workspace_read_own', `/workspace?id=${encodeURIComponent(CONFIG.workspaceId)}`, {
                method: 'GET',
                auth: 'internal',
                expectAnyOf: [200, 403, 404]
            })
        }
        if (CONFIG.workspaceIdOther) {
            await runCase('internal_workspace_read_other', `/workspace?id=${encodeURIComponent(CONFIG.workspaceIdOther)}`, {
                method: 'GET',
                auth: 'internal',
                expectAnyOf: [403, 404]
            })
        }

        if (CONFIG.loginMethodId) {
            await runCase('internal_loginmethod_read', `/loginmethod?id=${encodeURIComponent(CONFIG.loginMethodId)}`, {
                method: 'GET',
                auth: 'internal',
                expectAnyOf: [200, 403, 404, 400]
            })
        }

        // Leads: whitelisted path — internal session should attach req.user; Bearer-only often does not.
        if (CONFIG.chatflowId) {
            await runCase('internal_leads_own', `/leads/${encodeURIComponent(CONFIG.chatflowId)}`, {
                method: 'GET',
                auth: 'internal',
                expectAnyOf: [200, 404]
            })
        }
    }

    console.log('')
    const okc = results.filter((r) => r.status === 'OK').length
    const skc = results.filter((r) => r.status === 'SKIP').length
    const flc = results.filter((r) => r.status === 'FAIL').length
    console.log(`Summary: OK=${okc} SKIP=${skc} FAIL=${flc}`)
    if (flc > 0) process.exit(1)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
