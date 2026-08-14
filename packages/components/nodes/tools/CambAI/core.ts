/**
 * Shared CAMB AI HTTP helpers for Flowise nodes.
 * Uses raw HTTP to https://client.camb.ai/apis/ endpoints.
 */

const CAMB_BASE_URL = 'https://client.camb.ai/apis'

export interface CambConfig {
    apiKey: string
    maxPollAttempts?: number
    pollInterval?: number
}

/**
 * Make an authenticated request to the CAMB AI API.
 */
export async function cambFetch(
    path: string,
    config: CambConfig,
    options: RequestInit = {}
): Promise<Response> {
    const url = `${CAMB_BASE_URL}${path}`
    const headers: Record<string, string> = {
        'x-api-key': config.apiKey,
        ...(options.headers as Record<string, string> || {})
    }

    const res = await fetch(url, {
        ...options,
        headers
    })

    return res
}

/**
 * Make a JSON POST request to the CAMB AI API.
 */
export async function cambPost(
    path: string,
    config: CambConfig,
    body: Record<string, any>
): Promise<any> {
    const res = await cambFetch(path, config, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })

    if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`CAMB AI API error (${res.status}): ${errorText}`)
    }

    return res.json()
}

/**
 * Make a multipart POST request to the CAMB AI API (for file uploads).
 */
export async function cambPostMultipart(
    path: string,
    config: CambConfig,
    formData: FormData
): Promise<any> {
    const res = await cambFetch(path, config, {
        method: 'POST',
        body: formData
    })

    if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`CAMB AI API error (${res.status}): ${errorText}`)
    }

    return res.json()
}

/**
 * Poll a CAMB AI async task until completion.
 */
export async function pollTask(
    statusPath: string,
    config: CambConfig
): Promise<any> {
    const maxAttempts = config.maxPollAttempts || 60
    const interval = config.pollInterval || 2000

    for (let i = 0; i < maxAttempts; i++) {
        const res = await cambFetch(statusPath, config)
        if (!res.ok) {
            throw new Error(`CAMB AI poll error (${res.status}): ${await res.text()}`)
        }

        const data = await res.json()
        const status = data.status || data.message?.status

        if (status === 'SUCCESS' || status === 'completed' || status === 'complete') {
            return data
        }
        if (status === 'FAILED' || status === 'ERROR' || status === 'TIMEOUT' || status === 'PAYMENT_REQUIRED' || status === 'error' || status === 'failed') {
            throw new Error(`CAMB AI task failed: ${data.exception_reason || data.error || 'Unknown error'}`)
        }

        await new Promise((resolve) => setTimeout(resolve, interval))
    }

    throw new Error(`CAMB AI task timed out after ${maxAttempts * interval / 1000}s`)
}

/**
 * Stream TTS audio from the CAMB AI API and return as Buffer.
 */
export async function streamTTS(
    config: CambConfig,
    body: Record<string, any>
): Promise<Buffer> {
    const res = await cambFetch('/tts-stream', config, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })

    if (!res.ok) {
        throw new Error(`CAMB AI TTS error (${res.status}): ${await res.text()}`)
    }

    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
}

/**
 * Get audio result for a completed TTS task.
 */
export async function getTTSResult(
    runId: string,
    config: CambConfig
): Promise<Buffer> {
    const res = await cambFetch(`/tts-result/${runId}`, config)
    if (!res.ok) {
        throw new Error(`CAMB AI TTS result error (${res.status}): ${await res.text()}`)
    }
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
}
