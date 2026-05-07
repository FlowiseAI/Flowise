import fs from 'fs'
import os from 'os'
import path from 'path'
import { runContractTests } from './contract.test'
import { LocalJsonAdapter } from '../adapters/LocalJsonAdapter'

// ---------------------------------------------------------------------------
// Contract tests — validates LocalJsonAdapter against the shared contract
// ---------------------------------------------------------------------------

runContractTests('LocalJsonAdapter', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a2a-contract-'))
    const adapter = new LocalJsonAdapter({ dataDir })
    await adapter.initialize({})
    return adapter
})

// ---------------------------------------------------------------------------
// Adapter-specific tests
// ---------------------------------------------------------------------------

describe('LocalJsonAdapter — specific behavior', () => {
    let adapter: LocalJsonAdapter
    let dataDir: string

    const AGENT_A_ID = '550e8400-e29b-41d4-a716-446655440000'
    const AGENT_B_ID = '123e4567-e89b-12d3-a456-426614174000'

    beforeEach(async () => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a2a-test-'))
        adapter = new LocalJsonAdapter({ dataDir })
        await adapter.initialize({})
    })

    afterEach(() => {
        fs.rmSync(dataDir, { recursive: true, force: true })
    })

    describe('File-based persistence', () => {
        it('should persist data between adapter instances with same dataDir', async () => {
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

            const adapter2 = new LocalJsonAdapter({ dataDir })
            await adapter2.initialize({})
            const results = await adapter2.findAgents({ capability: 'test', limit: 20, offset: 0 })
            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('Agent One')
        })

        it('should create JSON files per table in dataDir', async () => {
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

            await adapter.createTask({
                id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                title: 'Task One',
                description: 'Test task',
                status: 'submitted',
                requesterId: AGENT_A_ID,
                artifactIds: [],
                metadata: {}
            })

            const agentsFile = path.join(dataDir, 'a2a_agents.json')
            const tasksFile = path.join(dataDir, 'a2a_tasks.json')
            expect(fs.existsSync(agentsFile)).toBe(true)
            expect(fs.existsSync(tasksFile)).toBe(true)

            const agentsContent = JSON.parse(fs.readFileSync(agentsFile, 'utf-8'))
            expect(agentsContent[AGENT_A_ID]).toBeDefined()
            expect(agentsContent[AGENT_A_ID].name).toBe('Agent One')

            const tasksContent = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'))
            expect(tasksContent['a1b2c3d4-e5f6-7890-abcd-ef1234567890']).toBeDefined()
            expect(tasksContent['a1b2c3d4-e5f6-7890-abcd-ef1234567890'].title).toBe('Task One')
        })

        it('should isolate data between different dataDirs', async () => {
            const dataDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'a2a-test-'))
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

            const adapter2 = new LocalJsonAdapter({ dataDir: dataDir2 })
            await adapter2.initialize({})
            const results = await adapter2.findAgents({ capability: 'test', limit: 20, offset: 0 })
            expect(results).toEqual([])

            fs.rmSync(dataDir2, { recursive: true, force: true })
        })
    })

    describe('Filter edge cases', () => {
        it('should apply multiple filter criteria', async () => {
            await adapter.registerAgent({
                id: AGENT_A_ID,
                name: 'Agent Alpha',
                description: 'Test',
                capabilities: ['fact-checking', 'summarization'],
                mcpEndpoints: [],
                artifactTypes: ['report'],
                ownerId: AGENT_B_ID,
                status: 'active',
                metadata: {}
            })

            await adapter.registerAgent({
                id: AGENT_B_ID,
                name: 'Agent Beta',
                description: 'Test',
                capabilities: ['fact-checking'],
                mcpEndpoints: [],
                artifactTypes: [],
                ownerId: AGENT_A_ID,
                status: 'idle',
                metadata: {}
            })

            // Match capability + status
            const results = await adapter.findAgents({
                capability: 'fact-checking',
                status: 'active',
                limit: 20,
                offset: 0
            })
            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('Agent Alpha')
        })
    })

    describe('UpdateAgentStatus edge cases', () => {
        it('should silently succeed for non-existent agent', async () => {
            await adapter.updateAgentStatus('00000000-0000-0000-0000-000000000000', 'offline')
        })
    })
})
