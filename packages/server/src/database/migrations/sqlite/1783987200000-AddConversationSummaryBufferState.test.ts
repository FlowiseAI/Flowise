import sqlite3 from 'sqlite3'
import type { QueryRunner } from 'typeorm'
import { AddConversationSummaryBufferState1783987200000 } from './1783987200000-AddConversationSummaryBufferState'

const run = (database: sqlite3.Database, statement: string): Promise<void> =>
    new Promise((resolve, reject) => {
        database.run(statement, (error) => (error ? reject(error) : resolve()))
    })

const get = <T>(database: sqlite3.Database, statement: string): Promise<T | undefined> =>
    new Promise((resolve, reject) => {
        database.get(statement, (error, result) => (error ? reject(error) : resolve(result as T | undefined)))
    })

const close = (database: sqlite3.Database): Promise<void> =>
    new Promise((resolve, reject) => {
        database.close((error) => (error ? reject(error) : resolve()))
    })

describe('AddConversationSummaryBufferState1783987200000', () => {
    it('creates and removes the summary checkpoint table and index', async () => {
        const database = new sqlite3.Database(':memory:')
        const queryRunner = {
            query: (statement: string) => run(database, statement)
        } as QueryRunner
        const migration = new AddConversationSummaryBufferState1783987200000()

        try {
            await migration.up(queryRunner)

            await expect(
                get<{ name: string }>(
                    database,
                    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'conversation_summary_buffer_state'"
                )
            ).resolves.toEqual({ name: 'conversation_summary_buffer_state' })
            await expect(
                get<{ name: string }>(
                    database,
                    "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'IDX_conversation_summary_buffer_state_session'"
                )
            ).resolves.toEqual({ name: 'IDX_conversation_summary_buffer_state_session' })

            await migration.down(queryRunner)

            await expect(
                get<{ name: string }>(
                    database,
                    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'conversation_summary_buffer_state'"
                )
            ).resolves.toBeUndefined()
        } finally {
            await close(database)
        }
    })
})
