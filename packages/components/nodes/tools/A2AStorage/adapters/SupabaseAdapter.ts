import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { A2AStorageAdapter, validateTaskTransition } from '../../../../src/A2AStorageAdapter'
import type {
    AgentCard,
    A2ATask,
    A2AMessage,
    A2AArtifact,
    A2ASession,
    A2AClaim,
    A2ADecision,
    A2AObservation,
    AgentStatus,
    TaskStatus,
    ArtifactPermission
} from '../../../../src/A2AStorageAdapter'

// ---------------------------------------------------------------------------
// SupabaseAdapter
// ---------------------------------------------------------------------------
// Uses the real @supabase/supabase-js client to persist A2A entities in
// Supabase PostgreSQL. Tables must be created via Supabase migrations or the
// SQL editor; initialize() is idempotent and assumes the client is ready.
//
// Column naming follows snake_case to align with Postgres conventions.
// JSON/JSONB fields (capabilities, metadata, permissions, etc.) are passed as
// plain objects — Supabase serialises them automatically.
// ---------------------------------------------------------------------------

export class SupabaseAdapter implements A2AStorageAdapter {
    readonly backend = 'supabase' as const
    private client: SupabaseClient

    constructor(config?: Record<string, unknown>) {
        const url = (config?.supabaseProjUrl as string) || process.env.SUPABASE_URL || ''
        const key = (config?.supabaseApiKey as string) || process.env.SUPABASE_API_KEY || ''
        if (!url || !key) {
            throw new Error('SupabaseAdapter: supabaseProjUrl/supabaseApiKey config or SUPABASE_URL/SUPABASE_API_KEY env vars are required')
        }
        this.client = createClient(url, key)
    }

    async initialize(_config: Record<string, unknown>): Promise<void> {
        // Supabase tables are created via migrations / dashboard.
        // This method is idempotent — the client is ready on construction.
    }

    private uuid(): string {
        return crypto.randomUUID()
    }

    // ── Registry ──

    async registerAgent(card: AgentCard): Promise<string> {
        const { error } = await this.client.from('a2a_agents').insert({
            id: card.id,
            name: card.name,
            description: card.description,
            capabilities: card.capabilities,
            mcp_endpoints: card.mcpEndpoints,
            artifact_types: card.artifactTypes,
            owner_id: card.ownerId,
            status: card.status,
            metadata: card.metadata
        })
        if (error) throw new Error(`registerAgent failed: ${error.message}`)
        return card.id
    }

    async getAgent(agentId: string): Promise<AgentCard | null> {
        const { data, error } = await this.client.from('a2a_agents').select().eq('id', agentId).single()
        if (error || !data) return null
        return this.rowToAgentCard(data)
    }

    async findAgents(filter: Record<string, unknown>): Promise<AgentCard[]> {
        const { data, error } = await this.client.from('a2a_agents').select()
        if (error) throw new Error(`findAgents failed: ${error.message}`)
        let agents = (data || []).map((row: Record<string, unknown>) => this.rowToAgentCard(row))

        if (filter.capability && typeof filter.capability === 'string') {
            agents = agents.filter((a) => a.capabilities.includes(filter.capability as string))
        }
        if (filter.status && typeof filter.status === 'string') {
            agents = agents.filter((a) => a.status === filter.status)
        }
        if (filter.mcpEndpoint && typeof filter.mcpEndpoint === 'string') {
            agents = agents.filter((a) => a.mcpEndpoints.includes(filter.mcpEndpoint as string))
        }
        if (filter.artifactType && typeof filter.artifactType === 'string') {
            agents = agents.filter((a) => a.artifactTypes.includes(filter.artifactType as string))
        }
        if (filter.agentId && typeof filter.agentId === 'string') {
            agents = agents.filter((a) => a.id === filter.agentId)
        }

        const offset = typeof filter.offset === 'number' ? filter.offset : 0
        const limit = typeof filter.limit === 'number' ? filter.limit : 20
        return agents.slice(offset, offset + limit)
    }

    async updateAgentStatus(agentId: string, status: AgentStatus): Promise<void> {
        const { error } = await this.client.from('a2a_agents').update({ status }).eq('id', agentId)
        if (error) throw new Error(`updateAgentStatus failed: ${error.message}`)
    }

    private rowToAgentCard(row: Record<string, unknown>): AgentCard {
        return {
            id: row.id as string,
            name: row.name as string,
            description: row.description as string,
            capabilities: (row.capabilities as string[]) || [],
            mcpEndpoints: (row.mcp_endpoints as string[]) || [],
            artifactTypes: (row.artifact_types as string[]) || [],
            ownerId: row.owner_id as string,
            status: row.status as AgentStatus,
            metadata: (row.metadata as Record<string, unknown>) || {}
        } as AgentCard
    }

    // ── Task ──

    async createTask(task: A2ATask): Promise<string> {
        const id = task.id || this.uuid()
        const { error } = await this.client.from('a2a_tasks').insert({
            id,
            title: task.title,
            description: task.description,
            status: task.status ?? 'submitted',
            requester_id: task.requesterId,
            assignee_id: task.assigneeId ?? null,
            artifact_ids: task.artifactIds,
            session_id: task.sessionId ?? null,
            result: task.result ?? null,
            error: task.error ?? null,
            metadata: task.metadata
        })
        if (error) throw new Error(`createTask failed: ${error.message}`)
        return id
    }

    async getTask(taskId: string): Promise<A2ATask | null> {
        const { data, error } = await this.client.from('a2a_tasks').select().eq('id', taskId).single()
        if (error || !data) return null
        return this.rowToTask(data)
    }

    async updateTaskStatus(taskId: string, status: TaskStatus, metadata?: Record<string, unknown>): Promise<void> {
        const { data, error } = await this.client.from('a2a_tasks').select('status, metadata').eq('id', taskId).single()
        if (error || !data) throw new Error(`Task ${taskId} not found`)
        validateTaskTransition(data.status as TaskStatus, status)

        const updateData: Record<string, unknown> = { status }
        if (metadata) {
            updateData.metadata = { ...((data.metadata as Record<string, unknown>) || {}), ...metadata }
        }

        const { error: updateError } = await this.client.from('a2a_tasks').update(updateData).eq('id', taskId)
        if (updateError) throw new Error(`updateTaskStatus failed: ${updateError.message}`)
    }

    async listTasks(filter: Record<string, unknown>): Promise<A2ATask[]> {
        let query = this.client.from('a2a_tasks').select()

        if (filter.status && typeof filter.status === 'string') {
            query = query.eq('status', filter.status)
        }
        if (filter.agentId && typeof filter.agentId === 'string') {
            query = query.or(`requester_id.eq.${filter.agentId},assignee_id.eq.${filter.agentId}`)
        }
        if (filter.ownerId && typeof filter.ownerId === 'string') {
            query = query.eq('requester_id', filter.ownerId)
        }

        const { data, error } = await query.order('created_at')
        if (error) throw new Error(`listTasks failed: ${error.message}`)
        const tasks = (data || []).map((row: Record<string, unknown>) => this.rowToTask(row))

        const offset = typeof filter.offset === 'number' ? filter.offset : 0
        const limit = typeof filter.limit === 'number' ? filter.limit : 20
        return tasks.slice(offset, offset + limit)
    }

    private rowToTask(row: Record<string, unknown>): A2ATask {
        return {
            id: row.id as string,
            title: row.title as string,
            description: row.description as string,
            status: row.status as TaskStatus,
            requesterId: row.requester_id as string,
            assigneeId: row.assignee_id as string | undefined,
            artifactIds: (row.artifact_ids as string[]) || [],
            sessionId: row.session_id as string | undefined,
            result: row.result ?? undefined,
            error: row.error as string | undefined,
            metadata: (row.metadata as Record<string, unknown>) || {}
        } as A2ATask
    }

    // ── Message ──

    async sendMessage(message: A2AMessage): Promise<string> {
        const id = message.id || this.uuid()
        const { error } = await this.client.from('a2a_messages').insert({
            id,
            task_id: message.taskId,
            sender_id: message.senderId,
            content: message.content,
            role: message.role,
            timestamp: message.timestamp
        })
        if (error) throw new Error(`sendMessage failed: ${error.message}`)
        return id
    }

    async getMessages(taskId: string, _limit?: number): Promise<A2AMessage[]> {
        const { data, error } = await this.client.from('a2a_messages').select().eq('task_id', taskId).order('timestamp')
        if (error) throw new Error(`getMessages failed: ${error.message}`)
        return (data || []).map((row: Record<string, unknown>) => ({
            id: row.id as string,
            taskId: row.task_id as string,
            senderId: row.sender_id as string,
            content: row.content as string,
            role: row.role as 'instruction' | 'query' | 'response' | 'status' | 'error',
            timestamp: row.timestamp as string
        })) as A2AMessage[]
    }

    // ── Artifact ──

    async registerArtifact(artifact: A2AArtifact): Promise<string> {
        const id = artifact.id || this.uuid()
        const { error } = await this.client.from('a2a_artifacts').insert({
            id,
            task_id: artifact.taskId ?? null,
            name: artifact.name,
            type: artifact.type,
            content: artifact.content,
            owner_id: artifact.ownerId,
            permissions: artifact.permissions ?? {}
        })
        if (error) throw new Error(`registerArtifact failed: ${error.message}`)
        return id
    }

    async getArtifact(artifactId: string): Promise<A2AArtifact | null> {
        const { data, error } = await this.client.from('a2a_artifacts').select().eq('id', artifactId).single()
        if (error || !data) return null
        return this.rowToArtifact(data)
    }

    async listArtifacts(taskId?: string, ownerId?: string): Promise<A2AArtifact[]> {
        let query = this.client.from('a2a_artifacts').select()
        if (taskId) query = query.eq('task_id', taskId)
        if (ownerId) query = query.eq('owner_id', ownerId)

        const { data, error } = await query
        if (error) throw new Error(`listArtifacts failed: ${error.message}`)
        return (data || []).map((row: Record<string, unknown>) => this.rowToArtifact(row))
    }

    private rowToArtifact(row: Record<string, unknown>): A2AArtifact {
        return {
            id: row.id as string,
            taskId: row.task_id as string | undefined,
            name: row.name as string,
            type: row.type as string,
            content: row.content ?? undefined,
            ownerId: row.owner_id as string,
            permissions: (row.permissions as Record<string, ArtifactPermission>) || {}
        } as A2AArtifact
    }

    async grantAccess(artifactId: string, agentId: string, permission: ArtifactPermission, _grantedBy: string): Promise<void> {
        const { data, error } = await this.client.from('a2a_artifacts').select('permissions').eq('id', artifactId).single()
        if (error || !data) throw new Error(`Artifact ${artifactId} not found`)
        const perms = { ...((data.permissions as Record<string, ArtifactPermission>) || {}) }
        perms[agentId] = permission

        const { error: updateError } = await this.client.from('a2a_artifacts').update({ permissions: perms }).eq('id', artifactId)
        if (updateError) throw new Error(`grantAccess failed: ${updateError.message}`)
    }

    async revokeAccess(artifactId: string, agentId: string): Promise<void> {
        const { data, error } = await this.client.from('a2a_artifacts').select('permissions').eq('id', artifactId).single()
        if (error || !data) return
        const perms = { ...((data.permissions as Record<string, ArtifactPermission>) || {}) }
        delete perms[agentId]

        const { error: updateError } = await this.client.from('a2a_artifacts').update({ permissions: perms }).eq('id', artifactId)
        if (updateError) throw new Error(`revokeAccess failed: ${updateError.message}`)
    }

    async checkAccess(artifactId: string, agentId: string): Promise<ArtifactPermission | null> {
        const { data, error } = await this.client.from('a2a_artifacts').select('permissions').eq('id', artifactId).single()
        if (error || !data) return null
        const perms = (data.permissions as Record<string, ArtifactPermission>) || {}
        return perms[agentId] ?? null
    }

    // ── Shared Context ──

    async createSession(session: A2ASession): Promise<string> {
        const id = session.id || this.uuid()
        const { error } = await this.client.from('a2a_sessions').insert({
            id,
            topic: session.topic,
            participants: session.participants,
            status: session.status ?? 'open',
            decision: session.decision ?? null
        })
        if (error) throw new Error(`createSession failed: ${error.message}`)
        return id
    }

    async getSession(sessionId: string): Promise<A2ASession | null> {
        const { data, error } = await this.client.from('a2a_sessions').select().eq('id', sessionId).single()
        if (error || !data) return null
        return {
            id: data.id as string,
            topic: data.topic as string,
            participants: (data.participants as string[]) || [],
            status: data.status as 'open' | 'deliberating' | 'decided' | 'closed',
            decision: data.decision as string | undefined
        } as A2ASession
    }

    async addClaim(sessionId: string, claim: A2AClaim): Promise<string> {
        const id = claim.id || this.uuid()
        const { error } = await this.client.from('a2a_claims').insert({
            id,
            session_id: sessionId,
            agent_id: claim.agentId,
            claim: claim.claim,
            evidence: claim.evidence,
            confidence: claim.confidence ?? 1.0
        })
        if (error) throw new Error(`addClaim failed: ${error.message}`)
        return id
    }

    async getClaims(sessionId: string): Promise<A2AClaim[]> {
        const { data, error } = await this.client.from('a2a_claims').select().eq('session_id', sessionId)
        if (error) throw new Error(`getClaims failed: ${error.message}`)
        return (data || []).map((row: Record<string, unknown>) => ({
            id: row.id as string,
            sessionId: row.session_id as string,
            agentId: row.agent_id as string,
            claim: row.claim as string,
            evidence: (row.evidence as string[]) || [],
            confidence: row.confidence as number
        })) as A2AClaim[]
    }

    async addObservation(sessionId: string, obs: A2AObservation): Promise<string> {
        const id = obs.id || this.uuid()
        const { error } = await this.client.from('a2a_observations').insert({
            id,
            session_id: sessionId,
            agent_id: obs.agentId,
            observation: obs.observation,
            timestamp: obs.timestamp
        })
        if (error) throw new Error(`addObservation failed: ${error.message}`)
        return id
    }

    async addDecision(sessionId: string, decision: A2ADecision): Promise<string> {
        const id = decision.id || this.uuid()
        const { error } = await this.client.from('a2a_decisions').insert({
            id,
            session_id: sessionId,
            decision: decision.decision,
            rationale: decision.rationale,
            based_on_claims: decision.basedOnClaims,
            agreed_by: decision.agreedBy,
            timestamp: decision.timestamp
        })
        if (error) throw new Error(`addDecision failed: ${error.message}`)
        return id
    }

    async getDecisions(sessionId: string): Promise<A2ADecision[]> {
        const { data, error } = await this.client.from('a2a_decisions').select().eq('session_id', sessionId).order('timestamp')
        if (error) throw new Error(`getDecisions failed: ${error.message}`)
        return (data || []).map((row: Record<string, unknown>) => ({
            id: row.id as string,
            sessionId: row.session_id as string,
            decision: row.decision as string,
            rationale: row.rationale as string | undefined,
            basedOnClaims: (row.based_on_claims as string[]) || [],
            agreedBy: (row.agreed_by as string[]) || [],
            timestamp: row.timestamp as string
        })) as A2ADecision[]
    }

    // ── Memory ──

    async saveContext(agentId: string, key: string, value: unknown): Promise<void> {
        const { error } = await this.client.from('a2a_context').upsert(
            {
                agent_id: agentId,
                key,
                value
            },
            { onConflict: 'agent_id,key' }
        )
        if (error) throw new Error(`saveContext failed: ${error.message}`)
    }

    async loadContext(agentId: string, key: string): Promise<unknown | null> {
        const { data, error } = await this.client.from('a2a_context').select().eq('agent_id', agentId).eq('key', key).single()
        if (error || !data) return null
        return data.value ?? null
    }
}
