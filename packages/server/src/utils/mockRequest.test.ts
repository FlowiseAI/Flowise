import { createMockRequest } from './mockRequest'
import { Request } from 'express'

describe('createMockRequest', () => {
    it('sets params.id to chatflowId', () => {
        const req = createMockRequest({ chatflowId: 'flow-123' })
        expect(req.params.id).toBe('flow-123')
    })

    it('sets default body with streaming=true and empty question', () => {
        const req = createMockRequest({ chatflowId: 'flow-123' })
        expect(req.body).toEqual({ streaming: true, question: '' })
    })

    it('merges custom body fields with defaults', () => {
        const req = createMockRequest({
            chatflowId: 'flow-123',
            body: { question: 'Hello', form: { key: 'value' } }
        })
        expect(req.body.streaming).toBe(true)
        expect(req.body.question).toBe('Hello')
        expect(req.body.form).toEqual({ key: 'value' })
    })

    it('custom body overrides defaults', () => {
        const req = createMockRequest({
            chatflowId: 'flow-123',
            body: { streaming: false }
        })
        expect(req.body.streaming).toBe(false)
    })

    it('defaults protocol to http when no sourceRequest', () => {
        const req = createMockRequest({ chatflowId: 'flow-123' })
        expect(req.protocol).toBe('http')
    })

    it('defaults files to empty array', () => {
        const req = createMockRequest({ chatflowId: 'flow-123' })
        expect(req.files).toEqual([])
    })

    it('get() returns host header from default headers', () => {
        const req = createMockRequest({ chatflowId: 'flow-123' })
        expect(req.get('host')).toBe('localhost:3000')
    })

    it('get() returns undefined for missing headers', () => {
        const req = createMockRequest({ chatflowId: 'flow-123' })
        expect(req.get('x-forwarded-proto')).toBeUndefined()
    })

    it('inherits protocol from sourceRequest', () => {
        const sourceReq = { protocol: 'https', headers: {}, get: jest.fn() } as unknown as Request
        const req = createMockRequest({ chatflowId: 'flow-123', sourceRequest: sourceReq })
        expect(req.protocol).toBe('https')
    })

    it('delegates get() to sourceRequest when provided', () => {
        const getMock = jest.fn().mockReturnValue('example.com')
        const sourceReq = { protocol: 'https', headers: { host: 'example.com' }, get: getMock } as unknown as Request
        const req = createMockRequest({ chatflowId: 'flow-123', sourceRequest: sourceReq })
        expect(req.get('host')).toBe('example.com')
        expect(getMock).toHaveBeenCalledWith('host')
    })

    it('copies headers from sourceRequest', () => {
        const sourceReq = {
            protocol: 'https',
            headers: { host: 'example.com', authorization: 'Bearer token' },
            get: jest.fn()
        } as unknown as Request
        const req = createMockRequest({ chatflowId: 'flow-123', sourceRequest: sourceReq })
        expect(req.headers).toHaveProperty('host', 'example.com')
        expect(req.headers).toHaveProperty('authorization', 'Bearer token')
    })
})
