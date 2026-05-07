import fs from 'fs'
import os from 'os'
import path from 'path'
import { LocalJsonAdapter } from '../../A2AStorage/adapters/LocalJsonAdapter'
import type { A2AStorageAdapter } from '../../../../src/A2AStorageAdapter'
import {
    SessionCreateTool,
    SessionGetTool,
    ClaimAddTool,
    ClaimsGetTool,
    ObservationAddTool,
    DecisionAddTool,
    DecisionsGetTool
} from '../core'

const AGENT_A = '550e8400-e29b-41d4-a716-446655440000'
const AGENT_B = '123e4567-e89b-12d3-a456-426614174000'

describe('A2ASharedContext Node', () => {
    let adapter: A2AStorageAdapter
    let dataDir: string

    beforeEach(async () => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a2a-shared-test-'))
        adapter = new LocalJsonAdapter({ dataDir })
        await adapter.initialize({})
    })

    afterEach(() => {
        fs.rmSync(dataDir, { recursive: true, force: true })
    })

    describe('SessionCreateTool + SessionGetTool', () => {
        it('should create and retrieve a session', async () => {
            const createTool = new SessionCreateTool(adapter)
            const id = await createTool._call({
                topic: 'Policy Deliberation',
                participants: [AGENT_A, AGENT_B]
            })
            expect(typeof id).toBe('string')

            const getTool = new SessionGetTool(adapter)
            const session = await getTool._call({ sessionId: id })
            expect(session).not.toBeNull()
            expect(session!.topic).toBe('Policy Deliberation')
            expect(session!.participants).toEqual([AGENT_A, AGENT_B])
            expect(session!.status).toBe('open')
        })

        it('should return null for unknown session', async () => {
            const tool = new SessionGetTool(adapter)
            const session = await tool._call({ sessionId: '00000000-0000-0000-0000-000000000000' })
            expect(session).toBeNull()
        })
    })

    describe('ClaimAddTool + ClaimsGetTool', () => {
        it('should add and retrieve claims with provenance', async () => {
            const createTool = new SessionCreateTool(adapter)
            const sessionId = await createTool._call({ topic: 'Test', participants: [AGENT_A] })

            const claimTool = new ClaimAddTool(adapter)
            const claimId = await claimTool._call({
                sessionId,
                agentId: AGENT_A,
                claim: 'This policy will increase GDP by 2%',
                evidence: ['IMF report 2025', 'World Bank data'],
                confidence: 0.85
            })
            expect(typeof claimId).toBe('string')

            const claims = await new ClaimsGetTool(adapter)._call({ sessionId })
            expect(claims).toHaveLength(1)
            expect(claims[0].claim).toContain('GDP')
            expect(claims[0].agentId).toBe(AGENT_A)
            expect(claims[0].confidence).toBe(0.85)
            expect(claims[0].evidence).toEqual(['IMF report 2025', 'World Bank data'])
        })
    })

    describe('ObservationAddTool', () => {
        it('should add observations linked to a session', async () => {
            const createTool = new SessionCreateTool(adapter)
            const sessionId = await createTool._call({ topic: 'Test', participants: [AGENT_A, AGENT_B] })

            const obsTool = new ObservationAddTool(adapter)
            const obsId = await obsTool._call({
                sessionId,
                agentId: AGENT_B,
                observation: 'The IMF data uses 2024 projections, not 2025'
            })
            expect(typeof obsId).toBe('string')
        })
    })

    describe('DecisionAddTool + DecisionsGetTool — full provenance chain', () => {
        it('should preserve claim→decision provenance', async () => {
            const createTool = new SessionCreateTool(adapter)
            const sessionId = await createTool._call({ topic: 'Provenance Test', participants: [AGENT_A, AGENT_B] })

            // Add claims
            const claimTool = new ClaimAddTool(adapter)
            const claim1 = await claimTool._call({ sessionId, agentId: AGENT_A, claim: 'Claim A', confidence: 0.9 })
            const claim2 = await claimTool._call({ sessionId, agentId: AGENT_B, claim: 'Claim B', confidence: 0.7 })

            // Add observation
            const obsTool = new ObservationAddTool(adapter)
            await obsTool._call({ sessionId, agentId: AGENT_A, observation: 'Observation on Claim A' })

            // Record decision that resolves both claims
            const decisionTool = new DecisionAddTool(adapter)
            const decId = await decisionTool._call({
                sessionId,
                decision: 'Both claims are valid',
                rationale: 'The evidence supports convergence',
                basedOnClaims: [claim1, claim2],
                agreedBy: [AGENT_A, AGENT_B]
            })
            expect(typeof decId).toBe('string')

            // Verifying provenance chain
            const decisions = await new DecisionsGetTool(adapter)._call({ sessionId })
            expect(decisions).toHaveLength(1)
            expect(decisions[0].decision).toBe('Both claims are valid')
            expect(decisions[0].rationale).toBe('The evidence supports convergence')
            expect(decisions[0].basedOnClaims).toEqual([claim1, claim2])
            expect(decisions[0].agreedBy).toEqual([AGENT_A, AGENT_B])

            // Claims still retrievable (provenance preserved)
            const claims = await new ClaimsGetTool(adapter)._call({ sessionId })
            expect(claims).toHaveLength(2)
        })
    })
})
