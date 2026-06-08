import { createHmac } from 'crypto'
import { verifyWebhookSignature, verifyPlainToken } from './signatureVerification'

const SECRET = 'test-secret-abc123'
const BODY = Buffer.from('{"event":"push"}')

function sign(secret: string, body: Buffer): string {
    return createHmac('sha256', secret).update(new Uint8Array(body)).digest('hex')
}

describe('verifyWebhookSignature', () => {
    it('returns true for a valid signature', () => {
        expect(verifyWebhookSignature(SECRET, BODY, sign(SECRET, BODY))).toBe(true)
    })

    it('returns false for a wrong secret', () => {
        expect(verifyWebhookSignature('wrong-secret', BODY, sign(SECRET, BODY))).toBe(false)
    })

    it('returns false for a tampered body', () => {
        const tamperedBody = Buffer.from('{"event":"delete"}')
        expect(verifyWebhookSignature(SECRET, tamperedBody, sign(SECRET, BODY))).toBe(false)
    })

    it('returns false for an empty signature string', () => {
        expect(verifyWebhookSignature(SECRET, BODY, '')).toBe(false)
    })

    it('returns false for a non-hex signature string', () => {
        expect(verifyWebhookSignature(SECRET, BODY, 'not-hex!!')).toBe(false)
    })

    it('returns false for a signature that is too short', () => {
        const truncated = sign(SECRET, BODY).slice(0, 10)
        expect(verifyWebhookSignature(SECRET, BODY, truncated)).toBe(false)
    })

    it('returns false for a signature that is too long', () => {
        const padded = sign(SECRET, BODY) + 'aabb'
        expect(verifyWebhookSignature(SECRET, BODY, padded)).toBe(false)
    })

    it('returns true for an empty body when signed correctly', () => {
        const emptyBody = Buffer.from('')
        expect(verifyWebhookSignature(SECRET, emptyBody, sign(SECRET, emptyBody))).toBe(true)
    })

    describe('sha256= prefix', () => {
        it('returns true for a valid sha256=<hex> signature', () => {
            const sig = 'sha256=' + sign(SECRET, BODY)
            expect(verifyWebhookSignature(SECRET, BODY, sig)).toBe(true)
        })

        it('returns false for sha256= with wrong secret', () => {
            const sig = 'sha256=' + sign('wrong-secret', BODY)
            expect(verifyWebhookSignature(SECRET, BODY, sig)).toBe(false)
        })

        it('returns false for sha256= with tampered body', () => {
            const sig = 'sha256=' + sign(SECRET, Buffer.from('{"event":"delete"}'))
            expect(verifyWebhookSignature(SECRET, BODY, sig)).toBe(false)
        })
    })

    describe('sha1= prefix', () => {
        function signSha1(secret: string, body: Buffer): string {
            return createHmac('sha1', secret).update(new Uint8Array(body)).digest('hex')
        }

        it('returns true for a valid sha1=<hex> signature', () => {
            const sig = 'sha1=' + signSha1(SECRET, BODY)
            expect(verifyWebhookSignature(SECRET, BODY, sig)).toBe(true)
        })

        it('returns false for sha1= with wrong secret', () => {
            const sig = 'sha1=' + signSha1('wrong-secret', BODY)
            expect(verifyWebhookSignature(SECRET, BODY, sig)).toBe(false)
        })

        it('returns false for sha1= with tampered body', () => {
            const sig = 'sha1=' + signSha1(SECRET, Buffer.from('{"event":"delete"}'))
            expect(verifyWebhookSignature(SECRET, BODY, sig)).toBe(false)
        })
    })
})

describe('verifyPlainToken', () => {
    it('returns true when provided token matches secret', () => {
        expect(verifyPlainToken(SECRET, SECRET)).toBe(true)
    })

    it('returns false when provided token does not match secret', () => {
        expect(verifyPlainToken(SECRET, 'wrong-token')).toBe(false)
    })

    it('returns false when lengths differ (shorter provided)', () => {
        expect(verifyPlainToken(SECRET, SECRET.slice(0, -1))).toBe(false)
    })

    it('returns false when lengths differ (longer provided)', () => {
        expect(verifyPlainToken(SECRET, SECRET + 'x')).toBe(false)
    })
})
