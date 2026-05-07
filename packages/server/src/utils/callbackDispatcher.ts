import { createHmac } from 'crypto'
import { secureAxiosRequest } from 'flowise-components'
import logger from './logger'

// Delays in ms before each attempt: attempt 1 is immediate, attempt 2 waits 3s, attempt 3 waits 6s
const RETRY_DELAYS = [0, 3000, 6000]

function sign(body: string, secret: string): string {
    return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

export async function dispatchCallback(url: string, payload: Record<string, unknown>, secret?: string): Promise<void> {
    const body = JSON.stringify(payload)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (secret) headers['X-Flowise-Signature'] = sign(body, secret)

    for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
        if (RETRY_DELAYS[attempt] > 0) {
            await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]))
        }
        try {
            await secureAxiosRequest({ method: 'POST', url, data: body, headers, timeout: 10000 })
            return
        } catch (err: any) {
            if (attempt === RETRY_DELAYS.length - 1) {
                logger.error(
                    `[callbackDispatcher] Failed to deliver callback to ${url} after ${RETRY_DELAYS.length} attempts: ${err.message}`
                )
            }
        }
    }
}
