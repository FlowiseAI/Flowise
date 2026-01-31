import { DataSource } from 'typeorm'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import fs from 'fs'
import path from 'path'

export class ChatFlowEventService {
    private dataSource: DataSource

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
    }

    async saveEvent(event: any) {
        const dir = path.join(__dirname, '../../../../logs/chat-flow-events')
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        const filePath = path.join(dir, `events.jsonl`)
        fs.appendFileSync(filePath, JSON.stringify(event, null, 2) + '\n')

        return event
    }
}
