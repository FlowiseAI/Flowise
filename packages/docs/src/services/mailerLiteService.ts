import { marketingConfig } from '@site/src/config/marketingConfig'

type Primitive = string | number | boolean

export interface MailerLiteSubscribeOptions {
    email: string
    name?: string
    fields?: Record<string, Primitive | undefined | null>
    groups?: string[]
    resubscribe?: boolean
}

export interface MailerLiteSubscribeResult {
    success: boolean
    message?: string
    alreadySubscribed?: boolean
    data?: Record<string, unknown>
}

class MailerLiteService {
    private readonly enabled: boolean

    constructor() {
        this.enabled = marketingConfig.mailerLite.enabled
    }

    private buildPayload(options: MailerLiteSubscribeOptions) {
        const payload: Record<string, unknown> = {
            email: options.email,
            fields: {}
        }

        if (options.name) {
            payload.name = options.name
        }

        if (options.groups && options.groups.length > 0) {
            payload.groups = options.groups
        }

        if (typeof options.resubscribe === 'boolean') {
            payload.resubscribe = options.resubscribe
        }

        if (options.fields) {
            const filteredEntries = Object.entries(options.fields).filter(
                ([, value]) => value !== undefined && value !== null && value !== ''
            )
            if (filteredEntries.length > 0) {
                payload.fields = Object.fromEntries(
                    filteredEntries.map(([key, value]) => [key, typeof value === 'boolean' ? (value ? 'true' : 'false') : value])
                )
            }
        }

        return payload
    }

    async subscribe(options: MailerLiteSubscribeOptions): Promise<MailerLiteSubscribeResult> {
        if (!this.enabled) {
            return {
                success: false,
                message: 'Subscription service is temporarily unavailable.'
            }
        }

        if (typeof window === 'undefined') {
            return {
                success: false,
                message: 'Subscription is only available in the browser.'
            }
        }

        try {
            const response = await fetch('/api/mailerlite-subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.buildPayload(options))
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                return {
                    success: false,
                    message: data.message || 'Unable to save your details. Please try again.'
                }
            }

            return {
                success: true,
                message: data.message || 'Details saved successfully!',
                alreadySubscribed: data.alreadySubscribed,
                data: data.data
            }
        } catch (error) {
            console.error('MailerLite subscribe error', error)
            return {
                success: false,
                message: 'Network error. Please try again in a moment.'
            }
        }
    }
}

export const mailerLiteService = new MailerLiteService()
