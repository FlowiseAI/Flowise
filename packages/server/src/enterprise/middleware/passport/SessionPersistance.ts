import Redis from 'ioredis'
import { RedisStore } from 'connect-redis'
import { getDatabaseSSLFromEnv } from '../../../DataSource'
import path from 'path'
import { getUserHome } from '../../../utils'

let redisClient: Redis | null = null
let redisStore: RedisStore | null = null

export const initializeRedisClientAndStore = (): RedisStore => {
    if (!redisClient) {
        if (process.env.REDIS_URL) {
            redisClient = new Redis(process.env.REDIS_URL)
        } else {
            redisClient = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                username: process.env.REDIS_USERNAME || undefined,
                password: process.env.REDIS_PASSWORD || undefined,
                tls:
                    process.env.REDIS_TLS === 'true'
                        ? {
                              cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
                              key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
                              ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined
                          }
                        : undefined
            })
        }
    }
    if (!redisStore) {
        redisStore = new RedisStore({ client: redisClient })
    }
    return redisStore
}

export const initializeDBClientAndStore: any = () => {
    const databaseType = process.env.DATABASE_TYPE || 'sqlite'
    switch (databaseType) {
        case 'mysql': {
            const expressSession = require('express-session')
            const MySQLStore = require('express-mysql-session')(expressSession)
            const options = {
                host: process.env.DATABASE_HOST,
                port: parseInt(process.env.DATABASE_PORT || '3306'),
                user: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                createDatabaseTable: true,
                schema: {
                    tableName: 'login_sessions'
                }
            }
            return new MySQLStore(options)
        }
        case 'mariadb':
            /* TODO: Implement MariaDB session store */
            break
        case 'postgres': {
            // default is postgres
            const pg = require('pg')
            const expressSession = require('express-session')
            const pgSession = require('connect-pg-simple')(expressSession)

            const pgPool = new pg.Pool({
                host: process.env.DATABASE_HOST,
                port: parseInt(process.env.DATABASE_PORT || '5432'),
                user: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                ssl: getDatabaseSSLFromEnv()
            })
            return new pgSession({
                pool: pgPool, // Connection pool
                tableName: 'login_sessions',
                schemaName: 'public',
                createTableIfMissing: true
            })
        }
        case 'default':
        case 'sqlite': {
            const expressSession = require('express-session')
            const sqlSession = require('connect-sqlite3')(expressSession)
            let flowisePath = path.join(getUserHome(), '.flowise')
            const homePath = process.env.DATABASE_PATH ?? flowisePath
            return new sqlSession({
                db: 'database.sqlite',
                table: 'login_sessions',
                dir: homePath
            })
        }
    }
}
