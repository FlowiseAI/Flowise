import { runContractTests } from './contract.test'
import { PostgresAdapter } from '../adapters/PostgresAdapter'

// ---------------------------------------------------------------------------
// Mock pg for contract tests (no real PostgreSQL required)
// ---------------------------------------------------------------------------

class MockPgDatabase {
    private tables: Record<string, Record<string, unknown>[]> = {}

    query(sql: string, params?: unknown[]): { rows: unknown[] } {
        const normalized = sql.replace(/\s+/g, ' ').trim()

        if (normalized.startsWith('CREATE TABLE IF NOT EXISTS') || normalized.startsWith('CREATE INDEX IF NOT EXISTS')) {
            const tableMatch = normalized.match(/(?:TABLE|INDEX) IF NOT EXISTS (\w+)/)
            if (tableMatch) {
                const table = tableMatch[1]
                if (!this.tables[table]) this.tables[table] = []
            }
            return { rows: [] }
        }

        if (normalized.startsWith('INSERT INTO a2a_context')) {
            if (!this.tables.a2a_context) this.tables.a2a_context = []
            const existing = this.tables.a2a_context.find((r) => r.agent_id === params![0] && r.key === params![1])
            if (existing) {
                existing.value = params![2]
            } else {
                this.tables.a2a_context.push({
                    agent_id: params![0],
                    key: params![1],
                    value: params![2]
                })
            }
            return { rows: [] }
        }

        if (normalized.startsWith('INSERT INTO')) {
            const tableMatch = normalized.match(/INSERT INTO (\w+)/)
            if (!tableMatch) throw new Error(`Cannot parse table from: ${normalized}`)
            const table = tableMatch[1]
            if (!this.tables[table]) this.tables[table] = []
            const colsMatch = normalized.match(/\(([^)]+)\) VALUES/)
            if (!colsMatch) throw new Error(`Cannot parse columns from: ${normalized}`)
            const cols = colsMatch[1].split(',').map((c) => c.trim())
            const row: Record<string, unknown> = {}
            cols.forEach((col, i) => {
                row[col] = params![i]
            })
            this.tables[table].push(row)
            return { rows: [] }
        }

        if (normalized === 'SELECT * FROM a2a_agents WHERE id = $1') {
            return { rows: (this.tables.a2a_agents || []).filter((r) => r.id === params![0]) }
        }

        if (normalized === 'SELECT * FROM a2a_agents') {
            return { rows: this.tables.a2a_agents || [] }
        }

        if (normalized === 'UPDATE a2a_agents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2') {
            const row = (this.tables.a2a_agents || []).find((r) => r.id === params![1])
            if (row) row.status = params![0]
            return { rows: [] }
        }

        if (normalized === 'SELECT * FROM a2a_tasks WHERE id = $1') {
            return { rows: (this.tables.a2a_tasks || []).filter((r) => r.id === params![0]) }
        }

        if (normalized === 'SELECT status, metadata FROM a2a_tasks WHERE id = $1') {
            const row = (this.tables.a2a_tasks || []).find((r) => r.id === params![0])
            return { rows: row ? [{ status: row.status, metadata: row.metadata }] : [] }
        }

        if (normalized === 'UPDATE a2a_tasks SET status = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3') {
            const row = (this.tables.a2a_tasks || []).find((r) => r.id === params![2])
            if (row) {
                row.status = params![0]
                row.metadata = params![1]
            }
            return { rows: [] }
        }

        if (normalized === 'UPDATE a2a_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2') {
            const row = (this.tables.a2a_tasks || []).find((r) => r.id === params![1])
            if (row) row.status = params![0]
            return { rows: [] }
        }

        if (normalized.startsWith('SELECT * FROM a2a_tasks WHERE 1=1')) {
            return { rows: this.filterTasks(normalized, params!) }
        }

        if (normalized === 'INSERT INTO a2a_messages (id, task_id, sender_id, content, role, timestamp) VALUES ($1, $2, $3, $4, $5, $6)') {
            if (!this.tables.a2a_messages) this.tables.a2a_messages = []
            this.tables.a2a_messages.push({
                id: params![0],
                task_id: params![1],
                sender_id: params![2],
                content: params![3],
                role: params![4],
                timestamp: params![5]
            })
            return { rows: [] }
        }

        if (normalized === 'SELECT * FROM a2a_messages WHERE task_id = $1 ORDER BY timestamp') {
            const rows = (this.tables.a2a_messages || [])
                .filter((r) => r.task_id === params![0])
                .sort((a, b) => ((a.timestamp as string) || '').localeCompare((b.timestamp as string) || ''))
            return { rows }
        }

        if (normalized === 'SELECT * FROM a2a_artifacts WHERE id = $1') {
            return { rows: (this.tables.a2a_artifacts || []).filter((r) => r.id === params![0]) }
        }

        if (normalized.startsWith('SELECT * FROM a2a_artifacts WHERE 1=1')) {
            return { rows: this.filterArtifacts(normalized, params!) }
        }

        if (normalized === 'SELECT permissions FROM a2a_artifacts WHERE id = $1') {
            const row = (this.tables.a2a_artifacts || []).find((r) => r.id === params![0])
            return { rows: row ? [{ permissions: row.permissions }] : [] }
        }

        if (normalized === 'UPDATE a2a_artifacts SET permissions = $1 WHERE id = $2') {
            const row = (this.tables.a2a_artifacts || []).find((r) => r.id === params![1])
            if (row) row.permissions = params![0]
            return { rows: [] }
        }

        if (normalized === 'INSERT INTO a2a_sessions (id, topic, participants, status, decision) VALUES ($1, $2, $3, $4, $5)') {
            if (!this.tables.a2a_sessions) this.tables.a2a_sessions = []
            this.tables.a2a_sessions.push({
                id: params![0],
                topic: params![1],
                participants: params![2],
                status: params![3],
                decision: params![4]
            })
            return { rows: [] }
        }

        if (normalized === 'SELECT * FROM a2a_sessions WHERE id = $1') {
            return { rows: (this.tables.a2a_sessions || []).filter((r) => r.id === params![0]) }
        }

        if (normalized === 'SELECT * FROM a2a_claims WHERE session_id = $1') {
            return { rows: (this.tables.a2a_claims || []).filter((r) => r.session_id === params![0]) }
        }

        if (
            normalized === 'INSERT INTO a2a_claims (id, session_id, agent_id, claim, evidence, confidence) VALUES ($1, $2, $3, $4, $5, $6)'
        ) {
            if (!this.tables.a2a_claims) this.tables.a2a_claims = []
            this.tables.a2a_claims.push({
                id: params![0],
                session_id: params![1],
                agent_id: params![2],
                claim: params![3],
                evidence: params![4],
                confidence: params![5]
            })
            return { rows: [] }
        }

        if (normalized === 'INSERT INTO a2a_observations (id, session_id, agent_id, observation, timestamp) VALUES ($1, $2, $3, $4, $5)') {
            if (!this.tables.a2a_observations) this.tables.a2a_observations = []
            this.tables.a2a_observations.push({
                id: params![0],
                session_id: params![1],
                agent_id: params![2],
                observation: params![3],
                timestamp: params![4]
            })
            return { rows: [] }
        }

        if (normalized === 'SELECT * FROM a2a_decisions WHERE session_id = $1 ORDER BY timestamp') {
            const rows = (this.tables.a2a_decisions || [])
                .filter((r) => r.session_id === params![0])
                .sort((a, b) => ((a.timestamp as string) || '').localeCompare((b.timestamp as string) || ''))
            return { rows }
        }

        if (
            normalized ===
            'INSERT INTO a2a_decisions (id, session_id, decision, rationale, based_on_claims, agreed_by, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)'
        ) {
            if (!this.tables.a2a_decisions) this.tables.a2a_decisions = []
            this.tables.a2a_decisions.push({
                id: params![0],
                session_id: params![1],
                decision: params![2],
                rationale: params![3],
                based_on_claims: params![4],
                agreed_by: params![5],
                timestamp: params![6]
            })
            return { rows: [] }
        }

        if (normalized === 'SELECT value FROM a2a_context WHERE agent_id = $1 AND key = $2') {
            const row = (this.tables.a2a_context || []).find((r) => r.agent_id === params![0] && r.key === params![1])
            return { rows: row ? [row] : [] }
        }

        throw new Error(`Unhandled query in mock pg: ${normalized}`)
    }

    private filterTasks(sql: string, params: unknown[]): Record<string, unknown>[] {
        let rows = [...(this.tables.a2a_tasks || [])]

        const statusMatch = sql.match(/AND status = \$(\d+)/)
        if (statusMatch) {
            rows = rows.filter((r) => r.status === params[parseInt(statusMatch[1]) - 1])
        }

        const agentMatch = sql.match(/AND \(requester_id = \$(\d+) OR assignee_id = \$(\d+)\)/)
        if (agentMatch) {
            const idx1 = parseInt(agentMatch[1]) - 1
            const idx2 = parseInt(agentMatch[2]) - 1
            rows = rows.filter((r) => r.requester_id === params[idx1] || r.assignee_id === params[idx2])
        }

        const ownerMatch = sql.match(/AND requester_id = \$(\d+)/)
        if (ownerMatch && !agentMatch) {
            rows = rows.filter((r) => r.requester_id === params[parseInt(ownerMatch[1]) - 1])
        }

        rows.sort((a, b) => ((a.created_at as string) || '').localeCompare((b.created_at as string) || ''))
        return rows
    }

    private filterArtifacts(sql: string, params: unknown[]): Record<string, unknown>[] {
        let rows = [...(this.tables.a2a_artifacts || [])]

        const taskMatch = sql.match(/AND task_id = \$(\d+)/)
        if (taskMatch) {
            rows = rows.filter((r) => r.task_id === params[parseInt(taskMatch[1]) - 1])
        }

        const ownerMatch = sql.match(/AND owner_id = \$(\d+)/)
        if (ownerMatch) {
            rows = rows.filter((r) => r.owner_id === params[parseInt(ownerMatch[1]) - 1])
        }

        return rows
    }
}

class MockPool {
    private db = new MockPgDatabase()

    async query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }> {
        return this.db.query(sql, params)
    }

    async end(): Promise<void> {}
}

jest.mock('pg', () => {
    return { Pool: MockPool }
})

// ---------------------------------------------------------------------------
// Contract tests — validates PostgresAdapter against the shared contract
// ---------------------------------------------------------------------------

runContractTests('PostgresAdapter', async () => {
    const adapter = new PostgresAdapter()
    await adapter.initialize({})
    return adapter
})

// ---------------------------------------------------------------------------
// Adapter-specific tests
// ---------------------------------------------------------------------------

describe('PostgresAdapter — specific behavior', () => {
    let adapter: PostgresAdapter

    const AGENT_A_ID = '550e8400-e29b-41d4-a716-446655440000'
    const AGENT_B_ID = '123e4567-e89b-12d3-a456-426614174000'

    beforeEach(async () => {
        adapter = new PostgresAdapter()
        await adapter.initialize({})
    })

    describe('Configuration', () => {
        it('should accept a connection string from config', () => {
            const a = new PostgresAdapter({ connectionString: 'postgresql://user:pass@localhost:5432/db' })
            expect(a.backend).toBe('postgres')
        })

        it('should construct with empty config (falls back to env defaults)', () => {
            const a = new PostgresAdapter()
            expect(a.backend).toBe('postgres')
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

            const adapter2 = new PostgresAdapter()
            await adapter2.initialize({})
            const results = await adapter2.findAgents({ capability: 'test', limit: 20, offset: 0 })
            expect(results).toEqual([])
        })
    })

    describe('Initialize idempotency', () => {
        it('should run DDL repeatedly without error', async () => {
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
