import {
    assertNodeVersion,
    FALLBACK_MIN_NODE_MAJOR,
    isSupportedNodeVersion,
    nodeVersionErrorMessage,
    parseMajor,
    parseRequiredMajor
} from './nodeVersion'

describe('nodeVersion utilities', () => {
    describe('parseMajor', () => {
        it('parses a v-prefixed version', () => {
            expect(parseMajor('v18.20.0')).toBe(18)
        })

        it('parses a non-prefixed version', () => {
            expect(parseMajor('24.1.0')).toBe(24)
        })

        it('returns null for an unparseable string', () => {
            expect(parseMajor('not-a-version')).toBeNull()
        })
    })

    describe('parseRequiredMajor', () => {
        it('parses a caret range', () => {
            expect(parseRequiredMajor('^24')).toBe(24)
        })

        it('parses a >= range', () => {
            expect(parseRequiredMajor('>=20.0.0')).toBe(20)
        })

        it('falls back when engines is undefined', () => {
            expect(parseRequiredMajor(undefined)).toBe(FALLBACK_MIN_NODE_MAJOR)
        })
    })

    describe('isSupportedNodeVersion', () => {
        it('rejects a version below the required major', () => {
            expect(isSupportedNodeVersion('v18.0.0', 24)).toBe(false)
        })

        it('accepts a version equal to the required major', () => {
            expect(isSupportedNodeVersion('v24.0.0', 24)).toBe(true)
        })

        it('accepts a version above the required major', () => {
            expect(isSupportedNodeVersion('v25.9.0', 24)).toBe(true)
        })

        it('fails open for an unparseable current version', () => {
            expect(isSupportedNodeVersion('garbage', 24)).toBe(true)
        })
    })

    describe('nodeVersionErrorMessage', () => {
        it('names the required major, the current version, and the File symptom', () => {
            const msg = nodeVersionErrorMessage('v18.20.0', 24)
            expect(msg).toContain('Flowise requires Node.js >= 24')
            expect(msg).toContain('v18.20.0')
            expect(msg).toContain('File is not defined')
        })
    })

    describe('assertNodeVersion', () => {
        it('flags an unsupported version with a message', () => {
            const result = assertNodeVersion('v18.0.0')
            expect(result.ok).toBe(false)
            expect(result.message).toBeDefined()
        })

        it('accepts a clearly supported version', () => {
            expect(assertNodeVersion('v99.0.0')).toEqual({ ok: true })
        })
    })
})
