import 'reflect-metadata'
import path from 'path'
import { DataSource } from 'typeorm'
import { ChatFlow } from './entity/ChatFlow'
import { ChatMessage } from './entity/ChatMessage'
import { OutgoingRobot } from './entity/OutgoingRobot'
import { Node } from './entity/Node'
import { getUserHome } from './utils'

let appDataSource: DataSource

export const init = async (): Promise<void> => {
    const homePath = path.join(getUserHome(), '.flowise')
    console.log('homePath', homePath)
    appDataSource = new DataSource({
        type: 'sqlite',
        database: path.resolve(homePath, 'database.sqlite'),
        synchronize: true,
        entities: [ChatFlow, ChatMessage, OutgoingRobot, Node],
        migrations: []
    })
}

export function getDataSource(): DataSource {
    if (appDataSource === undefined) {
        init()
    }
    return appDataSource
}
