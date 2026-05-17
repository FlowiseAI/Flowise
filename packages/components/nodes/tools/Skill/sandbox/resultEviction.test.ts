/**
 * resultEviction tests — verify the decorator only fires past the
 * threshold and that the evicted path is written through the backend.
 */

import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod/v3'
import type { BackendProtocol, SandboxFileTransfer } from '../../../../src/sandbox'
import { buildEvictionPreview, EvictingExecuteTool } from './resultEviction'

const innerSchema = z.object({ command: z.string() })

const makeInner = (payload: string): StructuredTool =>
    new (class extends StructuredTool {
        name = 'execute_test'
        description = ''
        schema = innerSchema
        async _call(): Promise<string> {
            return payload
        }
    })()

const makeBackend = (uploadResp?: { error?: string }): BackendProtocol & SandboxFileTransfer & { _uploads: any[] } => {
    const uploads: any[] = []
    const backend: any = {
        ls: jest.fn(),
        read: jest.fn(),
        readRaw: jest.fn(),
        write: jest.fn(),
        edit: jest.fn(),
        glob: jest.fn(),
        grep: jest.fn(),
        uploadFiles: jest.fn(async (files: any[]) => {
            uploads.push(...files)
            return files.map(([p]: any[]) => ({ path: p, error: uploadResp?.error ?? null }))
        })
    }
    backend._uploads = uploads
    return backend
}

describe('EvictingExecuteTool', () => {
    afterEach(() => {
        delete process.env.SKILL_LARGE_RESULT_THRESHOLD_BYTES
        delete process.env.SKILL_LARGE_RESULT_PREVIEW_BYTES
    })

    it('passes small payloads through unchanged', async () => {
        process.env.SKILL_LARGE_RESULT_THRESHOLD_BYTES = '1024'
        const backend = makeBackend()
        const wrapped = new EvictingExecuteTool({
            inner: makeInner('hello'),
            backend,
            outputDir: '/home/user/output'
        })
        const out = await wrapped.invoke({ command: 'echo' })
        expect(out).toBe('hello')
        expect(backend.uploadFiles).not.toHaveBeenCalled()
    })

    it('evicts oversized payloads through backend.uploadFiles and returns a preview', async () => {
        process.env.SKILL_LARGE_RESULT_THRESHOLD_BYTES = '50'
        process.env.SKILL_LARGE_RESULT_PREVIEW_BYTES = '20'
        const backend = makeBackend()
        const payload = 'A'.repeat(200) + 'BOUNDARY' + 'B'.repeat(200)
        const wrapped = new EvictingExecuteTool({
            inner: makeInner(payload),
            backend,
            outputDir: '/home/user/output',
            readToolName: 'read_file_test'
        })
        const out = await wrapped.invoke({ command: 'cat huge.log' })
        expect(backend.uploadFiles).toHaveBeenCalledTimes(1)
        const [path, bytes] = backend._uploads[0]
        expect(path.startsWith('/home/user/output/__large_tool_results/')).toBe(true)
        expect(bytes.length).toBe(Buffer.byteLength(payload, 'utf8'))
        expect(out).toMatch(/Output was \d+ bytes/)
        expect(out).toMatch(/Use the `read_file_test` tool/)
        expect(out).toContain('--- head ---')
        expect(out).toContain('--- tail ---')
    })

    it('falls back to the raw payload when uploadFiles fails (soft-fail)', async () => {
        process.env.SKILL_LARGE_RESULT_THRESHOLD_BYTES = '10'
        const backend = makeBackend({ error: 'io_error' })
        const wrapped = new EvictingExecuteTool({
            inner: makeInner('A'.repeat(100)),
            backend,
            outputDir: '/home/user/output'
        })
        const out = await wrapped.invoke({ command: 'foo' })
        expect(out.startsWith('[Eviction failed')).toBe(true)
        expect(out).toContain('A'.repeat(50))
    })
})

describe('buildEvictionPreview', () => {
    it('emits head + tail blocks when payload exceeds 2× preview', () => {
        process.env.SKILL_LARGE_RESULT_PREVIEW_BYTES = '5'
        const payload = 'HEADER1234XYZTAIL567'
        const preview = buildEvictionPreview(payload, '/o/p.txt', 'read_file_x')
        expect(preview).toContain('--- head ---')
        expect(preview).toContain('--- tail ---')
        delete process.env.SKILL_LARGE_RESULT_PREVIEW_BYTES
    })
})
