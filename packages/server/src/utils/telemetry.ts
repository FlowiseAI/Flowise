import { v4 as uuidv4 } from 'uuid'
import { PostHog } from 'posthog-node'
import path from 'path'
import fs from 'fs'
import { getUserHome, getUserSettingsFilePath } from '.'

export class Telemetry {
    postHog?: PostHog

    constructor() {
        if (process.env.DISABLE_FLOWISE_TELEMETRY !== 'true') {
            this.postHog = new PostHog('phc_jEDuFYnOnuXsws986TLWzuisbRjwFqTl9JL8tDMgqme')
        } else {
            this.postHog = undefined
        }
    }

    async id(): Promise<string> {
        try {
            const settingsContent = await fs.promises.readFile(getUserSettingsFilePath(), 'utf8')
            const settings = JSON.parse(settingsContent)
            return settings.instanceId
        } catch (error) {
            const instanceId = uuidv4()
            const settings = {
                instanceId
            }
            const defaultLocation = process.env.SECRETKEY_PATH
                ? path.join(process.env.SECRETKEY_PATH, 'settings.json')
                : path.join(getUserHome(), '.flowise', 'settings.json')
            await fs.promises.writeFile(defaultLocation, JSON.stringify(settings, null, 2))
            return instanceId
        }
    }

    async sendTelemetry(event: string, properties = {}): Promise<void> {
        if (this.postHog) {
            const distinctId = await this.id()
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
