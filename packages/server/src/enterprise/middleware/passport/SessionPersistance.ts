import Redis from 'ioredis'
import { RedisStore } from 'connect-redis'
import { getDatabaseSSLFromEnv } from '../../../DataSource'
import path from 'path'
import { getUserHome } from '../../../utils'
import type { Store } from 'express-session'
import { LoginSession } from '../../database/entities/login-session.entity'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'

let redisClient: Redis | null = null
let redisStore: RedisStore | null = null
let dbStore: Store | null = null

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
    if (dbStore) return dbStore

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
            dbStore = new MySQLStore(options)
            return dbStore
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
            dbStore = new pgSession({
                pool: pgPool, // Connection pool
                tableName: 'login_sessions',
                schemaName: 'public',
                createTableIfMissing: true
            })
            return dbStore
        }
        case 'default':
        case 'sqlite': {
            const expressSession = require('express-session')
            const sqlSession = require('connect-sqlite3')(expressSession)
            let flowisePath = path.join(getUserHome(), '.flowise')
            const homePath = process.env.DATABASE_PATH ?? flowisePath
            dbStore = new sqlSession({
                db: 'database.sqlite',
                table: 'login_sessions',
                dir: homePath
            })
            return dbStore
        }
    }
}

const getUserIdFromSession = (session: any): string | undefined => {
    try {
        const data = typeof session === 'string' ? JSON.parse(session) : session
        return data?.passport?.user?.id
    } catch {
        return undefined
    }
}

export const destroyAllSessionsForUser = async (userId: string): Promise<void> => {
    try {
        if (redisStore && redisClient) {
            const prefix = (redisStore as any)?.prefix ?? 'sess:'
            const pattern = `${prefix}*`
            const keysToDelete: string[] = []
            const batchSize = 1000

            const stream = redisClient.scanStream({
                match: pattern,
                count: batchSize
            })

            for await (const keysBatch of stream) {
                if (keysBatch.length === 0) continue

                const sessions = await redisClient.mget(...keysBatch)
                for (let i = 0; i < sessions.length; i++) {
                    if (getUserIdFromSession(sessions[i]) === userId) {
                        keysToDelete.push(keysBatch[i])
                    }
                }

                if (keysToDelete.length >= batchSize) {
                    const pipeline = redisClient.pipeline()
                    keysToDelete.splice(0, batchSize).forEach((key) => pipeline.del(key))
                    await pipeline.exec()
                }
            }

            if (keysToDelete.length > 0) {
                const pipeline = redisClient.pipeline()
                keysToDelete.forEach((key) => pipeline.del(key))
                await pipeline.exec()
            }
        } else if (dbStore) {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource
            const repository = dataSource.getRepository(LoginSession)

            const databaseType = process.env.DATABASE_TYPE || 'sqlite'
            switch (databaseType) {
                case 'sqlite':
                    await repository
                        .createQueryBuilder()
                        .delete()
                        .where(`json_extract(sess, '$.passport.user.id') = :userId`, { userId })
                        .execute()
                    break
                case 'mysql':
                    await repository
                        .createQueryBuilder()
                        .delete()
                        .where(`JSON_EXTRACT(sess, '$.passport.user.id') = :userId`, { userId })
                        .execute()
                    break
                case 'postgres':
                    await repository.createQueryBuilder().delete().where(`sess->'passport'->'user'->>'id' = :userId`, { userId }).execute()
                    break
                default:
                    console.warn('Unsupported database type:', databaseType)
                    break
            }
        } else {
            console.warn('Session store not available, skipping session invalidation')
        }
    } catch (error) {
        console.error('Error destroying sessions for user:', error)
        throw error
    }
}
