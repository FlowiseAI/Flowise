import fs from 'fs'
import os from 'os'
import path from 'path'
import { LocalJsonAdapter } from '../../A2AStorage/adapters/LocalJsonAdapter'
import type { A2AStorageAdapter } from '../../../../src/A2AStorageAdapter'
import { RegistryRegisterTool, RegistryFindTool } from '../../A2ARegistry/core'
import { TaskCreateTool, TaskStatusTool, TaskGetTool } from '../../A2ATask/core'
import { ArtifactRegisterTool, ArtifactGrantTool, ArtifactCheckTool } from '../../A2AArtifact/core'

const MASTER = '550e8400-e29b-41d4-a716-446655440000'
const ANALYST = '123e4567-e89b-12d3-a456-426614174000'

describe('A2A Integration', () => {
    let adapter: A2AStorageAdapter
    let dataDir: string

    beforeEach(async () => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a2a-integration-test-'))
        adapter = new LocalJsonAdapter({ dataDir })
        await adapter.initialize({})
    })

    afterEach(() => {
        fs.rmSync(dataDir, { recursive: true, force: true })
    })

    it('should run scatter-gather: registry→task→artifact', async () => {
        // 1. Register an analyst agent
        const regTool = new RegistryRegisterTool(adapter)
        await regTool._call({
            id: ANALYST,
            name: 'Data Analyst',
            description: 'Analyzes datasets',
            capabilities: ['data-analysis'],
            mcpEndpoints: [],
            artifactTypes: ['report'],
            ownerId: MASTER,
            status: 'active',
            metadata: {}
        })

        // 2. Find agent by capability
        const findTool = new RegistryFindTool(adapter)
        const agents = await findTool._call({ capability: 'data-analysis' })
        expect(agents).toHaveLength(1)
        expect(agents[0].name).toBe('Data Analyst')

        // 3. Create task for the analyst
        const createTool = new TaskCreateTool(adapter)
        const taskId = await createTool._call({
            title: 'Analyze Q4 data',
            description: 'Run analysis on Q4 financials',
            requesterId: MASTER,
            assigneeId: ANALYST
        })

        // 4. Analyst picks up and completes the task
        const statusTool = new TaskStatusTool(adapter)
        await statusTool._call({ taskId, status: 'working' })
        await statusTool._call({ taskId, status: 'completed' })

        const task = await new TaskGetTool(adapter)._call({ taskId })
        expect(task).not.toBeNull()
        expect(task!.status).toBe('completed')
        expect(task!.title).toBe('Analyze Q4 data')

        // 5. Store analysis artifact and grant access
        const artTool = new ArtifactRegisterTool(adapter)
        const artId = await artTool._call({
            name: 'Q4 Analysis Results',
            type: 'application/json',
            content: { findings: ['positive growth'] },
            ownerId: ANALYST,
            taskId
        })

        const grantTool = new ArtifactGrantTool(adapter)
        await grantTool._call({ artifactId: artId, agentId: MASTER, permission: 'read', grantedBy: ANALYST })

        const checkTool = new ArtifactCheckTool(adapter)
        const perm = await checkTool._call({ artifactId: artId, agentId: MASTER })
        expect(perm).toBe('read')
    })

    it('should enforce state machine: reject completed→working', async () => {
        const createTool = new TaskCreateTool(adapter)
        const taskId = await createTool._call({
            title: 'Test',
            description: '',
            requesterId: MASTER,
            assigneeId: ANALYST
        })

        const statusTool = new TaskStatusTool(adapter)
        await statusTool._call({ taskId, status: 'working' })
        await statusTool._call({ taskId, status: 'completed' })

        await expect(statusTool._call({ taskId, status: 'working' })).rejects.toThrow(/Invalid.*transition/)
    })
})
