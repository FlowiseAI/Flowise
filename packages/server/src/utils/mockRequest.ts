import { Request } from 'express'

export interface MockRequestOptions {
    /** The chatflow ID — sets req.params.id */
    chatflowId: string
    /** The request body — merged with defaults */
    body?: Record<string, any>
    /** The original incoming request to inherit host/protocol/headers from */
    sourceRequest?: Request
    /** Uploaded files (default: []) */
    files?: Express.Multer.File[]
}

/**
 * Create a typed mock Express Request for use with utilBuildChatflow().
 *
 * This factory produces a minimal Request-compatible object that satisfies
 * all properties accessed by utilBuildChatflow():
 *   - req.params.id
 *   - req.body (question, streaming, form, etc.)
 *   - req.get(header) (host, x-forwarded-proto, flowise-tool)
 *   - req.protocol
 *   - req.headers
 *   - req.files
 */
export function createMockRequest(options: MockRequestOptions): Request {
    const { chatflowId, body = {}, sourceRequest, files = [] } = options

    const headers: Record<string, string | string[] | undefined> = sourceRequest ? { ...sourceRequest.headers } : { host: 'localhost:3000' }

    return {
        params: { id: chatflowId },
        body: {
            streaming: true,
            question: '',
            ...body
        },
        get: (header: string) => {
            if (sourceRequest) return sourceRequest.get(header)
            const lower = header.toLowerCase()
            const val = headers[lower]
            return typeof val === 'string' ? val : undefined
        },
        protocol: sourceRequest?.protocol ?? 'http',
        headers,
        files
    } as unknown as Request
}
