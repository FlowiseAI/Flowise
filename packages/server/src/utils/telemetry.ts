import { v4 as uuidv4 } from 'uuid'
import { PostHog } from 'posthog-node'
import { getAppVersion } from '../utils'

export enum TelemetryEventType {
    'USER_CREATED' = 'user_created',
    'ORGANIZATION_CREATED' = 'organization_created'
}

export class Telemetry {
    postHog?: PostHog

    constructor() {
        if (process.env.POSTHOG_PUBLIC_API_KEY) {
            this.postHog = new PostHog(process.env.POSTHOG_PUBLIC_API_KEY)
        } else {
            this.postHog = undefined
        }
    }

    async sendTelemetry(event: string, properties: Record<string, any> = {}, orgId = ''): Promise<void> {
        properties.version = await getAppVersion()
        if (this.postHog) {
            const distinctId = orgId || uuidv4()
            this.postHog.capture({
                event,
                distinctId,
                properties
            })
        }
    }

    async flush(): Promise<void> {
        if (this.postHog) {
            await this.postHog.shutdownAsync()
        }
    }
}
