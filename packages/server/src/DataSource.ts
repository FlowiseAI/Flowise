import 'reflect-metadata'
import path from 'path'
import { DataSource } from 'typeorm'
import { ChatFlow } from './entity/ChatFlow'
import { ChatMessage } from './entity/ChatMessage'
import { Tool } from './entity/Tool'
import { getUserHome } from './utils'

let appDataSource: DataSource

export const init = async (): Promise<void> => {
    let homePath;
    switch (process.env.DATABASE_TYPE) {
        case 'sqlite':
            homePath = process.env.DATABASE_PATH ?? path.join(getUserHome(), '.flowise')
            appDataSource = new DataSource({
                type: 'sqlite',
                database: path.resolve(homePath, 'database.sqlite'),
                synchronize: (process.env.OVERRIDE_DATABASE == 'true'),
                entities: [ChatFlow, ChatMessage, Tool],
                migrations: []
            })
            break;
        case 'mysql':
            appDataSource = new DataSource({
                type: 'mysql',
                host: process.env.DATABASE_HOST,
                port: parseInt(process.env.DATABASE_PORT || '3306'),
                username: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                charset: 'utf8mb4',
                synchronize: (process.env.OVERRIDE_DATABASE == 'true'),
                entities: [ChatFlow, ChatMessage, Tool],
                migrations: []
            })
            break;
        case 'postgres':
            appDataSource = new DataSource({
                type: 'postgres',
                host: process.env.DATABASE_HOST,
                port: parseInt(process.env.DATABASE_PORT || '5432'),
                username: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                synchronize: (process.env.OVERRIDE_DATABASE == 'true'),
                entities: [ChatFlow, ChatMessage, Tool],
                migrations: []
            })
            break;
        default:
            homePath = process.env.DATABASE_PATH ?? path.join(getUserHome(), '.flowise')
            appDataSource = new DataSource({
                type: 'sqlite',
                database: path.resolve(homePath, 'database.sqlite'),
                synchronize: (process.env.OVERRIDE_DATABASE == 'true'),
                entities: [ChatFlow, ChatMessage, Tool],
                migrations: []
            })
            break;
    }
}

export function getDataSource(): DataSource {
    if (appDataSource === undefined) {
        init()
    }
    return appDataSource
}
