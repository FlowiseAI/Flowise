import fs from 'fs'
import os from 'os'
import path from 'path'
import { LocalJsonAdapter } from '../../A2AStorage/adapters/LocalJsonAdapter'
import type { A2AStorageAdapter } from '../../../../src/A2AStorageAdapter'
import { ArtifactRegisterTool, ArtifactGetTool, ArtifactListTool, ArtifactGrantTool, ArtifactRevokeTool, ArtifactCheckTool } from '../core'

const AGENT_A = '550e8400-e29b-41d4-a716-446655440000'
const AGENT_B = '123e4567-e89b-12d3-a456-426614174000'
const AGENT_C = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('A2AArtifact Node', () => {
    let adapter: A2AStorageAdapter
    let dataDir: string

    beforeEach(async () => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a2a-artifact-test-'))
        adapter = new LocalJsonAdapter({ dataDir })
        await adapter.initialize({})
    })

    afterEach(() => {
        fs.rmSync(dataDir, { recursive: true, force: true })
    })

    describe('ArtifactRegisterTool', () => {
        it('should register an artifact and return a UUID', async () => {
            const tool = new ArtifactRegisterTool(adapter)
            const id = await tool._call({
                name: 'Policy Analysis v2',
                type: 'application/json',
                content: { sections: ['intro', 'analysis'] },
                ownerId: AGENT_A
            })
            expect(typeof id).toBe('string')
            expect(id.length).toBeGreaterThan(0)
        })
    })

    describe('ArtifactGetTool', () => {
        it('should retrieve a registered artifact', async () => {
            const regTool = new ArtifactRegisterTool(adapter)
            const id = await regTool._call({ name: 'Test', type: 'text/plain', content: 'hello', ownerId: AGENT_A })

            const getTool = new ArtifactGetTool(adapter)
            const art = await getTool._call({ artifactId: id })
            expect(art).not.toBeNull()
            expect(art!.name).toBe('Test')
            expect(art!.ownerId).toBe(AGENT_A)
        })

        it('should return null for unknown artifact', async () => {
            const tool = new ArtifactGetTool(adapter)
            const art = await tool._call({ artifactId: '00000000-0000-0000-0000-000000000000' })
            expect(art).toBeNull()
        })
    })

    describe('ArtifactListTool', () => {
        it('should list artifacts by owner', async () => {
            const regTool = new ArtifactRegisterTool(adapter)
            await regTool._call({ name: 'A1', type: 'text', content: '', ownerId: AGENT_A })
            await regTool._call({ name: 'A2', type: 'text', content: '', ownerId: AGENT_B })

            const listTool = new ArtifactListTool(adapter)
            const results = await listTool._call({ ownerId: AGENT_A })
            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('A1')
        })
    })

    describe('ArtifactGrantTool + ArtifactCheckTool + ArtifactRevokeTool', () => {
        it('should grant, check, and revoke access', async () => {
            const regTool = new ArtifactRegisterTool(adapter)
            const id = await regTool._call({ name: 'X', type: 'text', content: '', ownerId: AGENT_A })

            // Initially no access for B
            const checkTool = new ArtifactCheckTool(adapter)
            const before = await checkTool._call({ artifactId: id, agentId: AGENT_B })
            expect(before).toBeNull()

            // Grant read access
            const grantTool = new ArtifactGrantTool(adapter)
            await grantTool._call({ artifactId: id, agentId: AGENT_B, permission: 'read', grantedBy: AGENT_A })

            // Now B has read access
            const after = await checkTool._call({ artifactId: id, agentId: AGENT_B })
            expect(after).toBe('read')

            // Revoke
            const revokeTool = new ArtifactRevokeTool(adapter)
            await revokeTool._call({ artifactId: id, agentId: AGENT_B })

            // Access removed
            const revoked = await checkTool._call({ artifactId: id, agentId: AGENT_B })
            expect(revoked).toBeNull()
        })

        it('should grant admin access and retain audit distinction', async () => {
            const regTool = new ArtifactRegisterTool(adapter)
            const id = await regTool._call({ name: 'Y', type: 'text', content: '', ownerId: AGENT_A })

            const grantTool = new ArtifactGrantTool(adapter)
            await grantTool._call({ artifactId: id, agentId: AGENT_C, permission: 'admin', grantedBy: AGENT_A })

            const checkTool = new ArtifactCheckTool(adapter)
            expect(await checkTool._call({ artifactId: id, agentId: AGENT_C })).toBe('admin')
        })
    })
})
