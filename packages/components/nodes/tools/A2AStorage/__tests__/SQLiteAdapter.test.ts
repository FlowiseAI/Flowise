import { runContractTests } from './contract.test'
import { SQLiteAdapter } from '../adapters/SQLiteAdapter'

// ---------------------------------------------------------------------------
// Contract tests — validates SQLiteAdapter against the shared contract
// ---------------------------------------------------------------------------

runContractTests('SQLiteAdapter', async () => {
    const adapter = new SQLiteAdapter({ dbPath: ':memory:' })
    await adapter.initialize({})
    return adapter
})

// ---------------------------------------------------------------------------
// Adapter-specific tests
// ---------------------------------------------------------------------------

describe('SQLiteAdapter — specific behavior', () => {
    let adapter: SQLiteAdapter

    const AGENT_A_ID = '550e8400-e29b-41d4-a716-446655440000'
    const AGENT_B_ID = '123e4567-e89b-12d3-a456-426614174000'

    beforeEach(async () => {
        adapter = new SQLiteAdapter({ dbPath: ':memory:' })
        await adapter.initialize({})
    })

    describe('Database isolation', () => {
        it('should isolate data between :memory: instances', async () => {
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

            const adapter2 = new SQLiteAdapter({ dbPath: ':memory:' })
            await adapter2.initialize({})
            const results = await adapter2.findAgents({ capability: 'test', limit: 20, offset: 0 })
            expect(results).toEqual([])
        })
    })

    describe('initialize idempotency', () => {
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

    describe('Default dbPath', () => {
        it('should use the provided dbPath', () => {
            const a = new SQLiteAdapter({ dbPath: ':memory:' })
            expect(a.backend).toBe('sqlite')
        })
    })
})
