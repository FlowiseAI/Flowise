import { isSandboxBackend } from './isSandboxBackend'

describe('isSandboxBackend — structural type guard', () => {
    it('returns true for a minimal SandboxBackendProtocol-shaped object', () => {
        expect(isSandboxBackend({ id: 'x', execute: () => ({ output: '', exitCode: 0, truncated: false }) })).toBe(true)
    })

    it('returns false for null / undefined / primitives', () => {
        expect(isSandboxBackend(null)).toBe(false)
        expect(isSandboxBackend(undefined)).toBe(false)
        expect(isSandboxBackend('hello')).toBe(false)
        expect(isSandboxBackend(42)).toBe(false)
    })

    it('returns false when execute is missing or not a function', () => {
        expect(isSandboxBackend({ id: 'x' })).toBe(false)
        expect(isSandboxBackend({ id: 'x', execute: 'nope' })).toBe(false)
    })

    it('returns false when id is missing or empty', () => {
        expect(isSandboxBackend({ execute: () => undefined })).toBe(false)
        expect(isSandboxBackend({ id: '', execute: () => undefined })).toBe(false)
        expect(isSandboxBackend({ id: 42, execute: () => undefined })).toBe(false)
    })

    it('accepts adapters / composites — no instanceof check is performed', () => {
        const composite = Object.assign(Object.create({ pretend: 'parent class' }), {
            id: 'composite-1',
            execute: async () => ({ output: '', exitCode: 0, truncated: false })
        })
        expect(isSandboxBackend(composite)).toBe(true)
    })
})
