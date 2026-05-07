import { Pool } from 'pg'
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
// JSON helpers
// ---------------------------------------------------------------------------

function toJson(value: unknown): string {
    return JSON.stringify(value ?? {})
}

function fromJson<T>(value: string | null | undefined): T | null {
    if (value == null) return null
    try {
        return JSON.parse(value) as T
    } catch {
        return null
    }
}

function toJsonArray(value: unknown[] | undefined): string {
    return JSON.stringify(value ?? [])
}

function fromJsonArray<T>(value: string | null | undefined): T[] {
    if (value == null) return []
    try {
        return JSON.parse(value) as T[]
    } catch {
        return []
    }
}

// ---------------------------------------------------------------------------
// DDL
// ---------------------------------------------------------------------------

const DDL = [
    `CREATE TABLE IF NOT EXISTS a2a_agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        capabilities JSONB DEFAULT '[]',
        mcp_endpoints JSONB DEFAULT '[]',
        artifact_types JSONB DEFAULT '[]',
        owner_id TEXT NOT NULL,
        status TEXT DEFAULT 'idle',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS a2a_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'submitted',
        requester_id TEXT NOT NULL,
        assignee_id TEXT,
        artifact_ids JSONB DEFAULT '[]',
        session_id TEXT,
        result JSONB,
        error TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_tasks_status ON a2a_tasks(status)`,
    `CREATE TABLE IF NOT EXISTS a2a_messages (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        role TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_messages_task ON a2a_messages(task_id)`,
    `CREATE TABLE IF NOT EXISTS a2a_artifacts (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content JSONB NOT NULL,
        owner_id TEXT NOT NULL,
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS a2a_sessions (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        participants JSONB DEFAULT '[]',
        status TEXT DEFAULT 'open',
        decision TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS a2a_claims (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        claim TEXT NOT NULL,
        evidence JSONB DEFAULT '[]',
        confidence REAL DEFAULT 1.0,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_claims_session ON a2a_claims(session_id)`,
    `CREATE TABLE IF NOT EXISTS a2a_decisions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        decision TEXT NOT NULL,
        rationale TEXT,
        based_on_claims JSONB DEFAULT '[]',
        agreed_by JSONB DEFAULT '[]',
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_decisions_session ON a2a_decisions(session_id)`,
    `CREATE TABLE IF NOT EXISTS a2a_observations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        observation TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_observations_session ON a2a_observations(session_id)`,
    `CREATE TABLE IF NOT EXISTS a2a_context (
        agent_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value JSONB NOT NULL,
        PRIMARY KEY (agent_id, key)
    )`
]

// ---------------------------------------------------------------------------
// PostgresAdapter
// ---------------------------------------------------------------------------

export class PostgresAdapter implements A2AStorageAdapter {
    readonly backend = 'postgres' as const
    private pool: Pool | null = null
    private connectionString: string

    constructor(config?: Record<string, unknown>) {
        if (config?.connectionString && typeof config.connectionString === 'string') {
            this.connectionString = config.connectionString
        } else {
            this.connectionString = this.buildConnectionStringFromEnv()
        }
    }

    private buildConnectionStringFromEnv(): string {
        const host = process.env.PGHOST || 'localhost'
        const port = process.env.PGPORT || '5432'
        const user = process.env.PGUSER || 'postgres'
        const password = process.env.PGPASSWORD || ''
        const database = process.env.PGDATABASE || 'postgres'
        return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`
    }

    async initialize(_config: Record<string, unknown>): Promise<void> {
        if (!this.pool) {
            this.pool = new Pool({ connectionString: this.connectionString })
        }
        // Idempotent: CREATE TABLE IF NOT EXISTS is safe to run repeatedly
        for (const stmt of DDL) {
            await this.pool.query(stmt)
        }
    }

    private uuid(): string {
        return crypto.randomUUID()
    }

    // ── Registry ──

    async registerAgent(card: AgentCard): Promise<string> {
        await this.pool!.query(
            `INSERT INTO a2a_agents (id, name, description, capabilities, mcp_endpoints, artifact_types, owner_id, status, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                card.id,
                card.name,
                card.description ?? null,
                toJsonArray(card.capabilities),
                toJsonArray(card.mcpEndpoints),
                toJsonArray(card.artifactTypes),
                card.ownerId,
                card.status,
                toJson(card.metadata)
            ]
        )
        return card.id
    }

    async getAgent(agentId: string): Promise<AgentCard | null> {
        const result = await this.pool!.query('SELECT * FROM a2a_agents WHERE id = $1', [agentId])
        const row = result.rows[0]
        if (!row) return null
        return this.rowToAgentCard(row)
    }

    async findAgents(filter: Record<string, unknown>): Promise<AgentCard[]> {
        const result = await this.pool!.query('SELECT * FROM a2a_agents')
        let agents = result.rows.map((row: Record<string, unknown>) => this.rowToAgentCard(row))

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
        await this.pool!.query('UPDATE a2a_agents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, agentId])
    }

    private rowToAgentCard(row: Record<string, unknown>): AgentCard {
        return {
            id: row.id as string,
            name: row.name as string,
            description: row.description as string,
            capabilities: fromJsonArray<string>(row.capabilities as string),
            mcpEndpoints: fromJsonArray<string>(row.mcp_endpoints as string),
            artifactTypes: fromJsonArray<string>(row.artifact_types as string),
            ownerId: row.owner_id as string,
            status: row.status as AgentStatus,
            metadata: fromJson<Record<string, unknown>>(row.metadata as string) ?? {}
        } as AgentCard
    }

    // ── Task ──

    async createTask(task: A2ATask): Promise<string> {
        const id = task.id || this.uuid()
        await this.pool!.query(
            `INSERT INTO a2a_tasks (id, title, description, status, requester_id, assignee_id, artifact_ids, session_id, result, error, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                id,
                task.title,
                task.description ?? null,
                task.status ?? 'submitted',
                task.requesterId,
                task.assigneeId ?? null,
                toJsonArray(task.artifactIds),
                task.sessionId ?? null,
                task.result !== undefined ? JSON.stringify(task.result) : null,
                task.error ?? null,
                toJson(task.metadata)
            ]
        )
        return id
    }

    async getTask(taskId: string): Promise<A2ATask | null> {
        const result = await this.pool!.query('SELECT * FROM a2a_tasks WHERE id = $1', [taskId])
        const row = result.rows[0]
        if (!row) return null
        return this.rowToTask(row)
    }

    async updateTaskStatus(taskId: string, status: TaskStatus, metadata?: Record<string, unknown>): Promise<void> {
        const result = await this.pool!.query('SELECT status, metadata FROM a2a_tasks WHERE id = $1', [taskId])
        const row = result.rows[0]
        if (!row) throw new Error(`Task ${taskId} not found`)
        validateTaskTransition(row.status as TaskStatus, status)

        if (metadata) {
            const merged = { ...fromJson<Record<string, unknown>>(row.metadata), ...metadata }
            await this.pool!.query('UPDATE a2a_tasks SET status = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [
                status,
                toJson(merged),
                taskId
            ])
        } else {
            await this.pool!.query('UPDATE a2a_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, taskId])
        }
    }

    async listTasks(filter: Record<string, unknown>): Promise<A2ATask[]> {
        let sql = 'SELECT * FROM a2a_tasks WHERE 1=1'
        const params: unknown[] = []

        if (filter.status && typeof filter.status === 'string') {
            sql += ` AND status = $${params.length + 1}`
            params.push(filter.status)
        }
        if (filter.agentId && typeof filter.agentId === 'string') {
            sql += ` AND (requester_id = $${params.length + 1} OR assignee_id = $${params.length + 2})`
            params.push(filter.agentId, filter.agentId)
        }
        if (filter.ownerId && typeof filter.ownerId === 'string') {
            sql += ` AND requester_id = $${params.length + 1}`
            params.push(filter.ownerId)
        }

        sql += ' ORDER BY created_at'

        const result = await this.pool!.query(sql, params)
        const tasks = result.rows.map((row: Record<string, unknown>) => this.rowToTask(row))

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
            artifactIds: fromJsonArray<string>(row.artifact_ids as string),
            sessionId: row.session_id as string | undefined,
            result: fromJson<unknown>(row.result as string) ?? undefined,
            error: row.error as string | undefined,
            metadata: fromJson<Record<string, unknown>>(row.metadata as string) ?? {}
        } as A2ATask
    }

    // ── Message ──

    async sendMessage(message: A2AMessage): Promise<string> {
        const id = message.id || this.uuid()
        await this.pool!.query(
            'INSERT INTO a2a_messages (id, task_id, sender_id, content, role, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, message.taskId, message.senderId, message.content, message.role, message.timestamp ?? null]
        )
        return id
    }

    async getMessages(taskId: string, _limit?: number): Promise<A2AMessage[]> {
        const result = await this.pool!.query('SELECT * FROM a2a_messages WHERE task_id = $1 ORDER BY timestamp', [taskId])
        return result.rows.map((row: Record<string, unknown>) => ({
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
        await this.pool!.query(
            'INSERT INTO a2a_artifacts (id, task_id, name, type, content, owner_id, permissions) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
                id,
                artifact.taskId ?? null,
                artifact.name,
                artifact.type,
                JSON.stringify(artifact.content),
                artifact.ownerId,
                toJson(artifact.permissions ?? {})
            ]
        )
        return id
    }

    async getArtifact(artifactId: string): Promise<A2AArtifact | null> {
        const result = await this.pool!.query('SELECT * FROM a2a_artifacts WHERE id = $1', [artifactId])
        const row = result.rows[0]
        if (!row) return null
        return this.rowToArtifact(row)
    }

    async listArtifacts(taskId?: string, ownerId?: string): Promise<A2AArtifact[]> {
        let sql = 'SELECT * FROM a2a_artifacts WHERE 1=1'
        const params: unknown[] = []

        if (taskId) {
            sql += ` AND task_id = $${params.length + 1}`
            params.push(taskId)
        }
        if (ownerId) {
            sql += ` AND owner_id = $${params.length + 1}`
            params.push(ownerId)
        }

        const result = await this.pool!.query(sql, params)
        return result.rows.map((row: Record<string, unknown>) => this.rowToArtifact(row))
    }

    private rowToArtifact(row: Record<string, unknown>): A2AArtifact {
        return {
            id: row.id as string,
            taskId: row.task_id as string | undefined,
            name: row.name as string,
            type: row.type as string,
            content: fromJson<unknown>(row.content as string) ?? undefined,
            ownerId: row.owner_id as string,
            permissions: fromJson<Record<string, ArtifactPermission>>(row.permissions as string) ?? {}
        } as A2AArtifact
    }

    async grantAccess(artifactId: string, agentId: string, permission: ArtifactPermission, _grantedBy: string): Promise<void> {
        const result = await this.pool!.query('SELECT permissions FROM a2a_artifacts WHERE id = $1', [artifactId])
        const row = result.rows[0]
        if (!row) throw new Error(`Artifact ${artifactId} not found`)
        const perms = fromJson<Record<string, ArtifactPermission>>(row.permissions) ?? {}
        perms[agentId] = permission
        await this.pool!.query('UPDATE a2a_artifacts SET permissions = $1 WHERE id = $2', [toJson(perms), artifactId])
    }

    async revokeAccess(artifactId: string, agentId: string): Promise<void> {
        const result = await this.pool!.query('SELECT permissions FROM a2a_artifacts WHERE id = $1', [artifactId])
        const row = result.rows[0]
        if (!row) return
        const perms = fromJson<Record<string, ArtifactPermission>>(row.permissions) ?? {}
        delete perms[agentId]
        await this.pool!.query('UPDATE a2a_artifacts SET permissions = $1 WHERE id = $2', [toJson(perms), artifactId])
    }

    async checkAccess(artifactId: string, agentId: string): Promise<ArtifactPermission | null> {
        const result = await this.pool!.query('SELECT permissions FROM a2a_artifacts WHERE id = $1', [artifactId])
        const row = result.rows[0]
        if (!row) return null
        const perms = fromJson<Record<string, ArtifactPermission>>(row.permissions) ?? {}
        return perms[agentId] ?? null
    }

    // ── Shared Context ──

    async createSession(session: A2ASession): Promise<string> {
        const id = session.id || this.uuid()
        await this.pool!.query('INSERT INTO a2a_sessions (id, topic, participants, status, decision) VALUES ($1, $2, $3, $4, $5)', [
            id,
            session.topic,
            toJsonArray(session.participants),
            session.status ?? 'open',
            session.decision ?? null
        ])
        return id
    }

    async getSession(sessionId: string): Promise<A2ASession | null> {
        const result = await this.pool!.query('SELECT * FROM a2a_sessions WHERE id = $1', [sessionId])
        const row = result.rows[0]
        if (!row) return null
        return {
            id: row.id as string,
            topic: row.topic as string,
            participants: fromJsonArray<string>(row.participants as string),
            status: row.status as 'open' | 'deliberating' | 'decided' | 'closed',
            decision: row.decision as string | undefined
        } as A2ASession
    }

    async addClaim(sessionId: string, claim: A2AClaim): Promise<string> {
        const id = claim.id || this.uuid()
        await this.pool!.query(
            'INSERT INTO a2a_claims (id, session_id, agent_id, claim, evidence, confidence) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, sessionId, claim.agentId, claim.claim, toJsonArray(claim.evidence), claim.confidence ?? 1.0]
        )
        return id
    }

    async getClaims(sessionId: string): Promise<A2AClaim[]> {
        const result = await this.pool!.query('SELECT * FROM a2a_claims WHERE session_id = $1', [sessionId])
        return result.rows.map((row: Record<string, unknown>) => ({
            id: row.id as string,
            sessionId: row.session_id as string,
            agentId: row.agent_id as string,
            claim: row.claim as string,
            evidence: fromJsonArray<string>(row.evidence as string),
            confidence: row.confidence as number
        })) as A2AClaim[]
    }

    async addObservation(sessionId: string, obs: A2AObservation): Promise<string> {
        const id = obs.id || this.uuid()
        await this.pool!.query(
            'INSERT INTO a2a_observations (id, session_id, agent_id, observation, timestamp) VALUES ($1, $2, $3, $4, $5)',
            [id, sessionId, obs.agentId, obs.observation, obs.timestamp ?? null]
        )
        return id
    }

    async addDecision(sessionId: string, decision: A2ADecision): Promise<string> {
        const id = decision.id || this.uuid()
        await this.pool!.query(
            'INSERT INTO a2a_decisions (id, session_id, decision, rationale, based_on_claims, agreed_by, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
                id,
                sessionId,
                decision.decision,
                decision.rationale ?? null,
                toJsonArray(decision.basedOnClaims),
                toJsonArray(decision.agreedBy),
                decision.timestamp ?? null
            ]
        )
        return id
    }

    async getDecisions(sessionId: string): Promise<A2ADecision[]> {
        const result = await this.pool!.query('SELECT * FROM a2a_decisions WHERE session_id = $1 ORDER BY timestamp', [sessionId])
        return result.rows.map((row: Record<string, unknown>) => ({
            id: row.id as string,
            sessionId: row.session_id as string,
            decision: row.decision as string,
            rationale: row.rationale as string | undefined,
            basedOnClaims: fromJsonArray<string>(row.based_on_claims as string),
            agreedBy: fromJsonArray<string>(row.agreed_by as string),
            timestamp: row.timestamp as string
        })) as A2ADecision[]
    }

    // ── Memory ──

    async saveContext(agentId: string, key: string, value: unknown): Promise<void> {
        await this.pool!.query(
            'INSERT INTO a2a_context (agent_id, key, value) VALUES ($1, $2, $3) ON CONFLICT (agent_id, key) DO UPDATE SET value = $3',
            [agentId, key, JSON.stringify(value)]
        )
    }

    async loadContext(agentId: string, key: string): Promise<unknown | null> {
        const result = await this.pool!.query('SELECT value FROM a2a_context WHERE agent_id = $1 AND key = $2', [agentId, key])
        const row = result.rows[0]
        if (!row) return null
        try {
            return JSON.parse(row.value as string)
        } catch {
            return row.value
        }
    }
}
