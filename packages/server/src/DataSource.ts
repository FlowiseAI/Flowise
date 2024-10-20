import 'reflect-metadata'
import path from 'path'
import * as fs from 'fs'
import { DataSource } from 'typeorm'
import { getUserHome } from './utils'
import { entities } from './database/entities'
import { sqliteMigrations } from './database/migrations/sqlite'
import { mysqlMigrations } from './database/migrations/mysql'
import { mariadbMigrations } from './database/migrations/mariadb'
import { postgresMigrations } from './database/migrations/postgres'

let appDataSource: DataSource

export const init = async (): Promise<void> => {
    let homePath
    let flowisePath = path.join(getUserHome(), '.flowise')
    if (!fs.existsSync(flowisePath)) {
        fs.mkdirSync(flowisePath)
    }
    switch (process.env.DATABASE_TYPE) {
        case 'sqlite':
            homePath = process.env.DATABASE_PATH ?? flowisePath
            appDataSource = new DataSource({
                type: 'sqlite',
                database: path.resolve(homePath, 'database.sqlite'),
                synchronize: false,
                migrationsRun: false,
                entities: Object.values(entities),
                migrations: sqliteMigrations
            })
            break
        case 'mysql':
            appDataSource = new DataSource({
                type: 'mysql',
                host: process.env.DATABASE_HOST,
                port: parseInt(process.env.DATABASE_PORT || '3306'),
                username: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                charset: 'utf8mb4',
                synchronize: false,
                migrationsRun: false,
                entities: Object.values(entities),
                migrations: mysqlMigrations,
                ssl: getDatabaseSSLFromEnv()
            })
            break
        case 'mariadb':
            appDataSource = new DataSource({
                type: 'mariadb',
                host: process.env.DATABASE_HOST,
                port: parseInt(process.env.DATABASE_PORT || '3306'),
                username: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                charset: 'utf8mb4',
                synchronize: false,
                migrationsRun: false,
                entities: Object.values(entities),
                migrations: mariadbMigrations,
                ssl: getDatabaseSSLFromEnv()
            })
            break
        case 'postgres':
            appDataSource = new DataSource({
                type: 'postgres',
                host: process.env.DATABASE_HOST,
                port: parseInt(process.env.DATABASE_PORT || '5432'),
                username: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                ssl: getDatabaseSSLFromEnv(),
                synchronize: false,
                migrationsRun: false,
                entities: Object.values(entities),
                migrations: postgresMigrations
            })
            break
        default:
            homePath = process.env.DATABASE_PATH ?? flowisePath
            appDataSource = new DataSource({
                type: 'sqlite',
                database: path.resolve(homePath, 'database.sqlite'),
                synchronize: false,
                migrationsRun: false,
                entities: Object.values(entities),
                migrations: sqliteMigrations
            })
            break
    }
}

export function getDataSource(): DataSource {
    if (appDataSource === undefined) {
        init()
    }
    return appDataSource
}

const getDatabaseSSLFromEnv = () => {
    if (process.env.DATABASE_SSL_KEY_BASE64) {
        return {
            rejectUnauthorized: false,
            ca: Buffer.from(process.env.DATABASE_SSL_KEY_BASE64, 'base64')
        }
    } else if (process.env.DATABASE_SSL === 'true') {
        return true
    }
    return undefined
}
