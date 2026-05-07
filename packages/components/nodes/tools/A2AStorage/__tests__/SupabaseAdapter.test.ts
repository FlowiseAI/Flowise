import { runContractTests } from './contract.test'
import { SupabaseAdapter } from '../adapters/SupabaseAdapter'

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js for contract tests (no real Supabase required)
// ---------------------------------------------------------------------------

class MockSupabaseDatabase {
    private tables: Record<string, Record<string, unknown>[]> = {}

    exec(builder: MockSupabaseQueryBuilder): { data: unknown; error: { message: string } | null } {
        const { table, operation, filters, orFilters, orderBy, singleMode, insertData, updateData, upsertData, upsertOptions } = builder

        switch (operation) {
            case 'insert': {
                if (!this.tables[table]) this.tables[table] = []
                for (const row of insertData) {
                    this.tables[table].push(structuredClone(row))
                }
                return { data: insertData.map((r) => structuredClone(r)), error: null }
            }

            case 'select': {
                let rows = [...(this.tables[table] || [])]

                for (const f of filters) {
                    rows = rows.filter((r) => r[f.col] === f.val)
                }

                for (const orFilter of orFilters) {
                    const conditions = orFilter.split(',')
                    rows = rows.filter((r) =>
                        conditions.some((cond) => {
                            const parts = cond.split('.')
                            if (parts.length !== 3) return false
                            const [col, op, val] = parts
                            return op === 'eq' && r[col] === val
                        })
                    )
                }

                if (orderBy) {
                    rows.sort((a, b) => String(a[orderBy.col] ?? '').localeCompare(String(b[orderBy.col] ?? '')))
                }

                if (singleMode) {
                    if (rows.length === 0) return { data: null, error: { message: 'No rows found' } }
                    if (rows.length > 1) return { data: null, error: { message: 'Multiple rows found' } }
                    return { data: rows[0], error: null }
                }

                return { data: rows, error: null }
            }

            case 'update': {
                const rows = this.tables[table] || []
                for (const row of rows) {
                    let match = true
                    for (const f of filters) {
                        if (row[f.col] !== f.val) {
                            match = false
                            break
                        }
                    }
                    if (match && updateData) {
                        Object.assign(row, structuredClone(updateData))
                    }
                }
                return { data: null, error: null }
            }

            case 'upsert': {
                if (!this.tables[table]) this.tables[table] = []
                for (const row of upsertData) {
                    const conflictKeys = upsertOptions?.onConflict ? upsertOptions.onConflict.split(',') : ['id']
                    const existingIdx = this.tables[table].findIndex((r) => conflictKeys.every((k) => r[k] === row[k]))
                    if (existingIdx >= 0) {
                        this.tables[table][existingIdx] = { ...this.tables[table][existingIdx], ...structuredClone(row) }
                    } else {
                        this.tables[table].push(structuredClone(row))
                    }
                }
                return { data: upsertData.map((r) => structuredClone(r)), error: null }
            }

            default:
                return { data: null, error: { message: 'No operation' } }
        }
    }
}

class MockSupabaseQueryBuilder {
    table: string
    operation: 'select' | 'insert' | 'update' | 'upsert' = 'select'
    filters: Array<{ col: string; val: unknown }> = []
    orFilters: string[] = []
    orderBy: { col: string } | null = null
    singleMode = false
    insertData: Record<string, unknown>[] = []
    updateData: Record<string, unknown> | null = null
    upsertData: Record<string, unknown>[] = []
    upsertOptions: { onConflict?: string } | null = null

    constructor(private db: MockSupabaseDatabase, table: string) {
        this.table = table
    }

    select() {
        this.operation = 'select'
        return this
    }

    eq(col: string, val: unknown) {
        this.filters.push({ col, val })
        return this
    }

    or(condition: string) {
        this.orFilters.push(condition)
        return this
    }

    order(col: string) {
        this.orderBy = { col }
        return this
    }

    insert(data: unknown) {
        this.operation = 'insert'
        this.insertData = Array.isArray(data) ? (data as Record<string, unknown>[]) : [data as Record<string, unknown>]
        return this
    }

    update(data: Record<string, unknown>) {
        this.operation = 'update'
        this.updateData = data
        return this
    }

    upsert(data: unknown, options?: { onConflict?: string }) {
        this.operation = 'upsert'
        this.upsertData = Array.isArray(data) ? (data as Record<string, unknown>[]) : [data as Record<string, unknown>]
        this.upsertOptions = options ?? null
        return this
    }

    single() {
        this.singleMode = true
        return this
    }

    then<T>(onfulfilled?: (value: { data: unknown; error: { message: string } | null }) => T | PromiseLike<T>): Promise<T | undefined> {
        const result = this.db.exec(this)
        return Promise.resolve(result).then(onfulfilled) as Promise<T | undefined>
    }
}

class MockSupabaseClient {
    private db = new MockSupabaseDatabase()

    from(table: string) {
        return new MockSupabaseQueryBuilder(this.db, table)
    }
}

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => new MockSupabaseClient())
}))

// ---------------------------------------------------------------------------
// Contract tests — validates SupabaseAdapter against the shared contract
// ---------------------------------------------------------------------------

runContractTests('SupabaseAdapter', async () => {
    const adapter = new SupabaseAdapter({ supabaseProjUrl: 'http://localhost:54321', supabaseApiKey: 'test-key' })
    await adapter.initialize({})
    return adapter
})

// ---------------------------------------------------------------------------
// Adapter-specific tests
// ---------------------------------------------------------------------------

describe('SupabaseAdapter — specific behavior', () => {
    let adapter: SupabaseAdapter

    const AGENT_A_ID = '550e8400-e29b-41d4-a716-446655440000'
    const AGENT_B_ID = '123e4567-e89b-12d3-a456-426614174000'

    beforeEach(async () => {
        adapter = new SupabaseAdapter({ supabaseProjUrl: 'http://localhost:54321', supabaseApiKey: 'test-key' })
        await adapter.initialize({})
    })

    describe('Configuration', () => {
        it('should accept url and key from config', () => {
            const a = new SupabaseAdapter({ supabaseProjUrl: 'http://test', supabaseApiKey: 'key' })
            expect(a.backend).toBe('supabase')
        })

        it('should throw when url and key are missing', () => {
            const originalUrl = process.env.SUPABASE_URL
            const originalKey = process.env.SUPABASE_API_KEY
            delete process.env.SUPABASE_URL
            delete process.env.SUPABASE_API_KEY

            expect(() => new SupabaseAdapter()).toThrow(
                /supabaseProjUrl\/supabaseApiKey config or SUPABASE_URL\/SUPABASE_API_KEY env vars are required/
            )

            if (originalUrl) process.env.SUPABASE_URL = originalUrl
            if (originalKey) process.env.SUPABASE_API_KEY = originalKey
        })
    })

    describe('Database isolation', () => {
        it('should isolate data between instances', async () => {
            await adapter.registerAgent({
                id: AGENT_A_ID,
                name: 'Agent One',
                description: 'Test',
                capabilities: ['test'],
                mcpEndpoints: [],
                artifactTypes: [],
                ownerId: AGENT_B_ID,
                status: 'active',
                metadata: {}
            })

            const adapter2 = new SupabaseAdapter({ supabaseProjUrl: 'http://localhost:54321', supabaseApiKey: 'test-key' })
            await adapter2.initialize({})
            const results = await adapter2.findAgents({ capability: 'test', limit: 20, offset: 0 })
            expect(results).toEqual([])
        })
    })

    describe('Initialize idempotency', () => {
        it('should run initialize repeatedly without error', async () => {
            await adapter.initialize({})
            await adapter.initialize({})
            await adapter.initialize({})
            // No error thrown = pass
        })
    })

    describe('Task status with metadata', () => {
        it('should update task metadata alongside status', async () => {
            const taskId = await adapter.createTask({
                id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                title: 'Task One',
                description: 'Test',
                status: 'submitted',
                requesterId: AGENT_A_ID,
                artifactIds: [],
                metadata: { priority: 'low' }
            })

            await adapter.updateTaskStatus(taskId, 'working', { priority: 'high', assignee: AGENT_B_ID })

            const task = await adapter.getTask(taskId)
            expect(task!.status).toBe('working')
            expect(task!.metadata).toEqual({ priority: 'high', assignee: AGENT_B_ID })
        })
    })

    describe('Artifact permissions persistence', () => {
        it('should persist grant and revoke across operations', async () => {
            const artifactId = await adapter.registerArtifact({
                id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
                taskId: undefined,
                name: 'Test Artifact',
                type: 'text/plain',
                content: 'data',
                ownerId: AGENT_A_ID,
                permissions: {}
            })

            await adapter.grantAccess(artifactId, AGENT_B_ID, 'read', AGENT_A_ID)
            let perm = await adapter.checkAccess(artifactId, AGENT_B_ID)
            expect(perm).toBe('read')

            await adapter.revokeAccess(artifactId, AGENT_B_ID)
            perm = await adapter.checkAccess(artifactId, AGENT_B_ID)
            expect(perm).toBeNull()
        })
    })

    describe('Message ordering', () => {
        it('should return messages ordered by timestamp', async () => {
            const taskId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
            await adapter.createTask({
                id: taskId,
                title: 'Task with messages',
                description: 'Test',
                status: 'submitted',
                requesterId: AGENT_A_ID,
                artifactIds: [],
                metadata: {}
            })

            await adapter.sendMessage({
                id: 'msg-1',
                taskId,
                senderId: AGENT_A_ID,
                content: 'Second message',
                role: 'response',
                timestamp: '2026-05-06T12:01:00.000Z'
            })

            await adapter.sendMessage({
                id: 'msg-2',
                taskId,
                senderId: AGENT_B_ID,
                content: 'First message',
                role: 'instruction',
                timestamp: '2026-05-06T12:00:00.000Z'
            })

            const messages = await adapter.getMessages(taskId)
            expect(messages).toHaveLength(2)
            expect(messages[0].content).toBe('First message')
            expect(messages[1].content).toBe('Second message')
        })
    })
})
