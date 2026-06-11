/**
 * Pure HTTP client for the Resemble Detect + Intelligence API.
 * Zero external dependencies (uses global fetch) so it can be live-tested
 * standalone with `bun`. `core.ts` wraps these into LangChain tools.
 *
 * Bearer auth; payloads wrapped as { success, item }; async jobs poll to completion.
 */
export const DEFAULT_BASE_URL = 'https://app.resemble.ai/api/v2'
const TERMINAL = new Set(['completed', 'failed', 'error', 'cancelled', 'success'])

export interface ResembleOptions {
    apiKey: string
    baseUrl?: string
}

function buildHeaders(apiKey: string, extra?: Record<string, string>): Record<string, string> {
    return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(extra || {})
    }
}

export async function rRequest(
    opts: ResembleOptions,
    method: string,
    path: string,
    body?: any,
    extraHeaders?: Record<string, string>
): Promise<any> {
    if (!opts.apiKey) throw new Error('Missing Resemble API key.')
    const base = (opts.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
    const url = `${base}/${path.replace(/^\/+/, '')}`
    const res = await fetch(url, {
        method,
        headers: buildHeaders(opts.apiKey, extraHeaders),
        body: body ? JSON.stringify(body) : undefined
    })
    const text = await res.text()
    let data: any
    try {
        data = JSON.parse(text)
    } catch {
        data = { raw: text }
    }
    if (res.status === 401 || res.status === 403) {
        throw new Error('Resemble authentication failed — check your API key.')
    }
    if (res.status >= 400) {
        const msg = (data && data.message) || `HTTP ${res.status}`
        throw new Error(`Resemble API error on ${method} ${path}: ${msg}`)
    }
    return data
}

export function rItem(data: any): any {
    return data && typeof data === 'object' && data.item && typeof data.item === 'object' ? data.item : data || {}
}

function statusDone(d: any): boolean {
    return TERMINAL.has((rItem(d).status || '').toString().toLowerCase())
}

export async function rPoll(
    opts: ResembleOptions,
    path: string,
    maxWaitSeconds = 120,
    isDone: (d: any) => boolean = statusDone
): Promise<any> {
    const wait = Math.max(1, maxWaitSeconds)
    const deadline = Date.now() + wait * 1000
    let delay = 2000
    let last = await rRequest(opts, 'GET', path)
    while (true) {
        if (isDone(last)) return last
        if (Date.now() >= deadline) throw new Error(`Resemble job did not complete within ${wait}s (GET ${path})`)
        await new Promise((r) => setTimeout(r, delay))
        delay = Math.min(10000, delay + 1000)
        last = await rRequest(opts, 'GET', path)
    }
}

export function rSanitize(d: any, n = 200): any {
    if (Array.isArray(d)) return d.map((x) => rSanitize(x, n))
    if (d && typeof d === 'object') {
        const o: any = {}
        for (const k of Object.keys(d)) o[k] = rSanitize(d[k], n)
        return o
    }
    if (typeof d === 'string' && d.startsWith('data:') && d.length > n) {
        return `<inline base64 omitted — ${d.length} chars>`
    }
    return d
}

// ---- High-level operations -------------------------------------------------
export async function detect(opts: ResembleOptions, args: any): Promise<any> {
    const body: any = { url: args.url }
    const flags: [string, string][] = [
        ['run_intelligence', 'intelligence'],
        ['audio_source_tracing', 'audio_source_tracing'],
        ['visualize', 'visualize'],
        ['use_reverse_search', 'use_reverse_search'],
        ['use_ood_detector', 'use_ood_detector'],
        ['zero_retention_mode', 'zero_retention_mode']
    ]
    for (const [a, k] of flags) if (args[a]) body[k] = true
    if (args.model_types && args.model_types !== 'auto') body.model_types = args.model_types
    const submitted = await rRequest(opts, 'POST', '/detect', body)
    const uuid = rItem(submitted).uuid
    const result = uuid ? await rPoll(opts, `/detect/${uuid}`, args.max_wait_seconds || 120) : submitted
    return rSanitize(result)
}

export async function intelligence(opts: ResembleOptions, args: any): Promise<any> {
    const body: any = { url: args.url, json: args.structured_json !== false }
    if (args.media_type && args.media_type !== 'auto') body.media_type = args.media_type
    const result = await rRequest(opts, 'POST', '/intelligence', body)
    const it = rItem(result)
    const status = (it.status || '').toString().toLowerCase()
    if (it.uuid && status && !TERMINAL.has(status)) {
        return rSanitize(await rPoll(opts, `/intelligences/${it.uuid}`, args.max_wait_seconds || 120))
    }
    return rSanitize(result)
}

export async function watermarkDetect(opts: ResembleOptions, args: any): Promise<any> {
    return rSanitize(await rRequest(opts, 'POST', '/watermark/detect', { url: args.url }, { Prefer: 'wait' }))
}

export async function watermarkApply(opts: ResembleOptions, args: any): Promise<any> {
    const body: any = { url: args.url }
    if (args.strength != null && args.strength !== '') body.strength = Number(args.strength)
    if (args.custom_message) body.custom_message = args.custom_message
    let result = await rRequest(opts, 'POST', '/watermark/apply', body, { Prefer: 'wait' })
    const it = rItem(result)
    if (!(it.watermarked_media || it.url) && it.uuid) {
        // The apply result has no `status` field — done means the media URL is present.
        result = await rPoll(opts, `/watermark/apply/${it.uuid}/result`, args.max_wait_seconds || 120, (d) => {
            const r = rItem(d)
            return !!(r.watermarked_media || r.url)
        })
    }
    return rSanitize(result)
}
