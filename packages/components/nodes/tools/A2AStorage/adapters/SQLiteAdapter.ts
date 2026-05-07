import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import {
    A2AStorageAdapter,
    validateTaskTransition,
    type AgentCard,
    type A2ATask,
    type A2AMessage,
    type A2AArtifact,
    type A2ASession,
    type A2AClaim,
    type A2ADecision,
    type A2AObservation,
    type AgentStatus,
    type TaskStatus,
    type ArtifactPermission
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
        capabilities TEXT DEFAULT '[]',
        mcp_endpoints TEXT DEFAULT '[]',
        artifact_types TEXT DEFAULT '[]',
        owner_id TEXT NOT NULL,
        status TEXT DEFAULT 'idle',
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS a2a_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'submitted',
        requester_id TEXT NOT NULL,
        assignee_id TEXT,
        artifact_ids TEXT DEFAULT '[]',
        session_id TEXT,
        result TEXT,
        error TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_tasks_status ON a2a_tasks(status)`,
    `CREATE TABLE IF NOT EXISTS a2a_messages (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        role TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_messages_task ON a2a_messages(task_id)`,
    `CREATE TABLE IF NOT EXISTS a2a_artifacts (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        permissions TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS a2a_sessions (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        participants TEXT DEFAULT '[]',
        status TEXT DEFAULT 'open',
        decision TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS a2a_claims (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        claim TEXT NOT NULL,
        evidence TEXT DEFAULT '[]',
        confidence REAL DEFAULT 1.0,
        timestamp TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_claims_session ON a2a_claims(session_id)`,
    `CREATE TABLE IF NOT EXISTS a2a_decisions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        decision TEXT NOT NULL,
        rationale TEXT,
        based_on_claims TEXT DEFAULT '[]',
        agreed_by TEXT DEFAULT '[]',
        timestamp TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_decisions_session ON a2a_decisions(session_id)`,
    `CREATE TABLE IF NOT EXISTS a2a_observations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        observation TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_observations_session ON a2a_observations(session_id)`,
    `CREATE TABLE IF NOT EXISTS a2a_context (
        agent_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (agent_id, key)
    )`
]

// ---------------------------------------------------------------------------
// SQLiteAdapter
// ---------------------------------------------------------------------------

export class SQLiteAdapter implements A2AStorageAdapter {
    readonly backend = 'sqlite' as const
    private db!: Database.Database
    private _dbPath: string

    constructor(config?: Record<string, unknown>) {
        this._dbPath = (config?.dbPath as string) || './.a2a-data/a2a.db'
    }

    async initialize(_config: Record<string, unknown>): Promise<void> {
        if (!this.db) {
            // Ensure parent directory exists for file-based databases
            if (this._dbPath !== ':memory:') {
                const dir = path.dirname(this._dbPath)
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true })
                }
            }
            this.db = new Database(this._dbPath)
        }
        // Idempotent: CREATE TABLE IF NOT EXISTS is safe to run repeatedly
        for (const stmt of DDL) {
            this.db.exec(stmt)
        }
    }

    private uuid(): string {
        return crypto.randomUUID()
    }

    // ── Registry ──

    async registerAgent(card: AgentCard): Promise<string> {
        const stmt = this.db.prepare(
            `INSERT INTO a2a_agents (id, name, description, capabilities, mcp_endpoints, artifact_types, owner_id, status, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        stmt.run(
            card.id,
            card.name,
            card.description ?? null,
            toJsonArray(card.capabilities),
            toJsonArray(card.mcpEndpoints),
            toJsonArray(card.artifactTypes),
            card.ownerId,
            card.status,
            toJson(card.metadata)
        )
        return card.id
    }

    async getAgent(agentId: string): Promise<AgentCard | null> {
        const row = this.db.prepare('SELECT * FROM a2a_agents WHERE id = ?').get(agentId) as Record<string, unknown> | undefined
        if (!row) return null
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

    async findAgents(filter: Record<string, unknown>): Promise<AgentCard[]> {
        const rows = this.db.prepare('SELECT * FROM a2a_agents').all() as Record<string, unknown>[]
        let agents = rows.map((row) => ({
            id: row.id as string,
            name: row.name as string,
            description: row.description as string,
            capabilities: fromJsonArray<string>(row.capabilities as string),
            mcpEndpoints: fromJsonArray<string>(row.mcp_endpoints as string),
            artifactTypes: fromJsonArray<string>(row.artifact_types as string),
            ownerId: row.owner_id as string,
            status: row.status as AgentStatus,
            metadata: fromJson<Record<string, unknown>>(row.metadata as string) ?? {}
        })) as AgentCard[]

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
        this.db.prepare('UPDATE a2a_agents SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, agentId)
    }

    // ── Task ──

    async createTask(task: A2ATask): Promise<string> {
        const id = task.id || this.uuid()
        const stmt = this.db.prepare(
            `INSERT INTO a2a_tasks (id, title, description, status, requester_id, assignee_id, artifact_ids, session_id, result, error, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        stmt.run(
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
        )
        return id
    }

    async getTask(taskId: string): Promise<A2ATask | null> {
        const row = this.db.prepare('SELECT * FROM a2a_tasks WHERE id = ?').get(taskId) as Record<string, unknown> | undefined
        if (!row) return null
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

    async updateTaskStatus(taskId: string, status: TaskStatus, metadata?: Record<string, unknown>): Promise<void> {
        const row = this.db.prepare('SELECT status, metadata FROM a2a_tasks WHERE id = ?').get(taskId) as
            | { status: string; metadata: string }
            | undefined
        if (!row) throw new Error(`Task ${taskId} not found`)
        validateTaskTransition(row.status as TaskStatus, status)

        if (metadata) {
            const merged = { ...fromJson<Record<string, unknown>>(row.metadata), ...metadata }
            this.db
                .prepare('UPDATE a2a_tasks SET status = ?, metadata = ?, updated_at = datetime("now") WHERE id = ?')
                .run(status, toJson(merged), taskId)
        } else {
            this.db.prepare('UPDATE a2a_tasks SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, taskId)
        }
    }

    async listTasks(filter: Record<string, unknown>): Promise<A2ATask[]> {
        let sql = 'SELECT * FROM a2a_tasks WHERE 1=1'
        const params: unknown[] = []

        if (filter.status && typeof filter.status === 'string') {
            sql += ' AND status = ?'
            params.push(filter.status)
        }
        if (filter.agentId && typeof filter.agentId === 'string') {
            sql += ' AND (requester_id = ? OR assignee_id = ?)'
            params.push(filter.agentId, filter.agentId)
        }
        if (filter.ownerId && typeof filter.ownerId === 'string') {
            sql += ' AND requester_id = ?'
            params.push(filter.ownerId)
        }

        sql += ' ORDER BY created_at'

        const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[]
        const tasks = rows.map((row) => ({
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
        })) as A2ATask[]

        const offset = typeof filter.offset === 'number' ? filter.offset : 0
        const limit = typeof filter.limit === 'number' ? filter.limit : 20
        return tasks.slice(offset, offset + limit)
    }

    // ── Message ──

    async sendMessage(message: A2AMessage): Promise<string> {
        const id = message.id || this.uuid()
        this.db
            .prepare('INSERT INTO a2a_messages (id, task_id, sender_id, content, role, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, message.taskId, message.senderId, message.content, message.role, message.timestamp ?? null)
        return id
    }

    async getMessages(taskId: string, _limit?: number): Promise<A2AMessage[]> {
        const rows = this.db.prepare('SELECT * FROM a2a_messages WHERE task_id = ? ORDER BY timestamp').all(taskId) as Record<
            string,
            unknown
        >[]
        return rows.map((row) => ({
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
        this.db
            .prepare('INSERT INTO a2a_artifacts (id, task_id, name, type, content, owner_id, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(
                id,
                artifact.taskId ?? null,
                artifact.name,
                artifact.type,
                JSON.stringify(artifact.content),
                artifact.ownerId,
                toJson(artifact.permissions ?? {})
            )
        return id
    }

    async getArtifact(artifactId: string): Promise<A2AArtifact | null> {
        const row = this.db.prepare('SELECT * FROM a2a_artifacts WHERE id = ?').get(artifactId) as Record<string, unknown> | undefined
        if (!row) return null
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

    async listArtifacts(taskId?: string, ownerId?: string): Promise<A2AArtifact[]> {
        let sql = 'SELECT * FROM a2a_artifacts WHERE 1=1'
        const params: unknown[] = []

        if (taskId) {
            sql += ' AND task_id = ?'
            params.push(taskId)
        }
        if (ownerId) {
            sql += ' AND owner_id = ?'
            params.push(ownerId)
        }

        const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[]
        return rows.map((row) => ({
            id: row.id as string,
            taskId: row.task_id as string | undefined,
            name: row.name as string,
            type: row.type as string,
            content: fromJson<unknown>(row.content as string) ?? undefined,
            ownerId: row.owner_id as string,
            permissions: fromJson<Record<string, ArtifactPermission>>(row.permissions as string) ?? {}
        })) as A2AArtifact[]
    }

    async grantAccess(artifactId: string, agentId: string, permission: ArtifactPermission, _grantedBy: string): Promise<void> {
        const row = this.db.prepare('SELECT permissions FROM a2a_artifacts WHERE id = ?').get(artifactId) as
            | { permissions: string }
            | undefined
        if (!row) throw new Error(`Artifact ${artifactId} not found`)
        const perms = fromJson<Record<string, ArtifactPermission>>(row.permissions) ?? {}
        perms[agentId] = permission
        this.db.prepare('UPDATE a2a_artifacts SET permissions = ? WHERE id = ?').run(toJson(perms), artifactId)
    }

    async revokeAccess(artifactId: string, agentId: string): Promise<void> {
        const row = this.db.prepare('SELECT permissions FROM a2a_artifacts WHERE id = ?').get(artifactId) as
            | { permissions: string }
            | undefined
        if (!row) return
        const perms = fromJson<Record<string, ArtifactPermission>>(row.permissions) ?? {}
        delete perms[agentId]
        this.db.prepare('UPDATE a2a_artifacts SET permissions = ? WHERE id = ?').run(toJson(perms), artifactId)
    }

    async checkAccess(artifactId: string, agentId: string): Promise<ArtifactPermission | null> {
        const row = this.db.prepare('SELECT permissions FROM a2a_artifacts WHERE id = ?').get(artifactId) as
            | { permissions: string }
            | undefined
        if (!row) return null
        const perms = fromJson<Record<string, ArtifactPermission>>(row.permissions) ?? {}
        return perms[agentId] ?? null
    }

    // ── Shared Context ──

    async createSession(session: A2ASession): Promise<string> {
        const id = session.id || this.uuid()
        this.db
            .prepare('INSERT INTO a2a_sessions (id, topic, participants, status, decision) VALUES (?, ?, ?, ?, ?)')
            .run(id, session.topic, toJsonArray(session.participants), session.status ?? 'open', session.decision ?? null)
        return id
    }

    async getSession(sessionId: string): Promise<A2ASession | null> {
        const row = this.db.prepare('SELECT * FROM a2a_sessions WHERE id = ?').get(sessionId) as Record<string, unknown> | undefined
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
        this.db
            .prepare('INSERT INTO a2a_claims (id, session_id, agent_id, claim, evidence, confidence) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, sessionId, claim.agentId, claim.claim, toJsonArray(claim.evidence), claim.confidence ?? 1.0)
        return id
    }

    async getClaims(sessionId: string): Promise<A2AClaim[]> {
        const rows = this.db.prepare('SELECT * FROM a2a_claims WHERE session_id = ?').all(sessionId) as Record<string, unknown>[]
        return rows.map((row) => ({
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
        this.db
            .prepare('INSERT INTO a2a_observations (id, session_id, agent_id, observation, timestamp) VALUES (?, ?, ?, ?, ?)')
            .run(id, sessionId, obs.agentId, obs.observation, obs.timestamp ?? null)
        return id
    }

    async addDecision(sessionId: string, decision: A2ADecision): Promise<string> {
        const id = decision.id || this.uuid()
        this.db
            .prepare(
                'INSERT INTO a2a_decisions (id, session_id, decision, rationale, based_on_claims, agreed_by, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .run(
                id,
                sessionId,
                decision.decision,
                decision.rationale ?? null,
                toJsonArray(decision.basedOnClaims),
                toJsonArray(decision.agreedBy),
                decision.timestamp ?? null
            )
        return id
    }

    async getDecisions(sessionId: string): Promise<A2ADecision[]> {
        const rows = this.db.prepare('SELECT * FROM a2a_decisions WHERE session_id = ? ORDER BY timestamp').all(sessionId) as Record<
            string,
            unknown
        >[]
        return rows.map((row) => ({
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
        this.db
            .prepare('INSERT OR REPLACE INTO a2a_context (agent_id, key, value) VALUES (?, ?, ?)')
            .run(agentId, key, JSON.stringify(value))
    }

    async loadContext(agentId: string, key: string): Promise<unknown | null> {
        const row = this.db.prepare('SELECT value FROM a2a_context WHERE agent_id = ? AND key = ?').get(agentId, key) as
            | { value: string }
            | undefined
        if (!row) return null
        try {
            return JSON.parse(row.value)
        } catch {
            return row.value
        }
    }
}
