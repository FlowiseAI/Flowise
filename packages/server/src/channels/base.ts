import crypto from 'crypto'
import { ChannelAuthenticationError, ChannelConfigurationError } from './errors'
import { ChannelAdapter, ChannelAdapterRequest, ChannelRequestContext } from './types'

export abstract class BaseChannelAdapter implements ChannelAdapter {
    abstract readonly provider: ChannelAdapter['provider']

    abstract verifyRequest(request: ChannelAdapterRequest, context: ChannelRequestContext): Promise<void>

    abstract parseIncomingMessage(
        request: ChannelAdapterRequest,
        context: ChannelRequestContext
    ): ReturnType<ChannelAdapter['parseIncomingMessage']>

    abstract sendMessage(
        message: Parameters<ChannelAdapter['sendMessage']>[0],
        incoming: Parameters<ChannelAdapter['sendMessage']>[1],
        context: Parameters<ChannelAdapter['sendMessage']>[2]
    ): ReturnType<ChannelAdapter['sendMessage']>

    protected assertSecret(secret: string | undefined, providerLabel: string): string {
        if (!secret) {
            throw new ChannelConfigurationError(`${providerLabel} secret is missing`)
        }
        return secret
    }

    protected verifyHmacSha256(payload: string, expectedSignature: string | undefined, secret: string): void {
        if (!expectedSignature) {
            throw new ChannelAuthenticationError('Missing signature header')
        }

        const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex')

        const normalizedExpected = this.normalizeSignature(expectedSignature)
        const normalizedDigest = this.normalizeSignature(digest)

        const expectedBuffer = Buffer.from(normalizedExpected, 'utf8')
        const digestBuffer = Buffer.from(normalizedDigest, 'utf8')

        if (expectedBuffer.length !== digestBuffer.length) {
            throw new ChannelAuthenticationError()
        }

        const isValid = crypto.timingSafeEqual(expectedBuffer, digestBuffer)
        if (!isValid) {
            throw new ChannelAuthenticationError()
        }
    }

    private normalizeSignature(signature: string): string {
        return signature.trim().replace(/^sha256=/i, '')
    }
}
