import fs from 'fs'
import path from 'path'
import {
    A2AStorageAdapter,
    validateTaskTransition,
    AgentCard,
    A2ATask,
    A2AMessage,
    A2AArtifact,
    A2ASession,
    A2AClaim,
    A2ADecision,
    A2AObservation
} from '../../../../src/A2AStorageAdapter'
import type { AgentStatus, TaskStatus, ArtifactPermission } from '../../../../src/A2AStorageAdapter'

type RowObject = Record<string, unknown>

export class LocalJsonAdapter implements A2AStorageAdapter {
    readonly backend = 'localjson' as const
    private dataDir: string

    constructor(config?: Record<string, unknown>) {
        this.dataDir = (config?.dataDir as string) || './.a2a-data'
    }

    async initialize(config: Record<string, unknown>): Promise<void> {
        if (config?.dataDir) {
            this.dataDir = config.dataDir as string
        }
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true })
        }
    }

    private uuid(): string {
        return crypto.randomUUID()
    }

    private getFilePath(tableName: string): string {
        return path.join(this.dataDir, `${tableName}.json`)
    }

    private readTable(tableName: string): Record<string, RowObject> {
        const filePath = this.getFilePath(tableName)
        if (!fs.existsSync(filePath)) {
            return {}
        }
        const raw = fs.readFileSync(filePath, 'utf-8')
        return JSON.parse(raw) as Record<string, RowObject>
    }

    private writeTable(tableName: string, data: Record<string, RowObject>): void {
        const filePath = this.getFilePath(tableName)
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    }

    // ── Registry ──

    async registerAgent(card: AgentCard): Promise<string> {
        const table = this.readTable('a2a_agents')
        table[card.id] = { ...card } as RowObject
        this.writeTable('a2a_agents', table)
        return card.id
    }

    async getAgent(agentId: string): Promise<AgentCard | null> {
        const table = this.readTable('a2a_agents')
        const row = table[agentId]
        return row ? (row as unknown as AgentCard) : null
    }

    async findAgents(filter: Record<string, unknown>): Promise<AgentCard[]> {
        const table = this.readTable('a2a_agents')
        const agents = Object.values(table) as unknown as AgentCard[]
        return agents.filter((a) => {
            if (filter.capability && typeof filter.capability === 'string') {
                if (!a.capabilities.includes(filter.capability)) return false
            }
            if (filter.status && a.status !== filter.status) return false
            if (filter.mcpEndpoint && typeof filter.mcpEndpoint === 'string') {
                if (!a.mcpEndpoints.includes(filter.mcpEndpoint)) return false
            }
            if (filter.artifactType && typeof filter.artifactType === 'string') {
                if (!a.artifactTypes.includes(filter.artifactType)) return false
            }
            if (filter.agentId && typeof filter.agentId === 'string') {
                if (a.id !== filter.agentId) return false
            }
            return true
        })
    }

    async updateAgentStatus(agentId: string, status: AgentStatus): Promise<void> {
        const table = this.readTable('a2a_agents')
        const agent = table[agentId]
        if (!agent) return
        agent.status = status
        this.writeTable('a2a_agents', table)
    }

    // ── Task ──

    async createTask(task: A2ATask): Promise<string> {
        const table = this.readTable('a2a_tasks')
        const row = { ...task, id: task.id || this.uuid() } as RowObject
        table[row.id as string] = row
        this.writeTable('a2a_tasks', table)
        return row.id as string
    }

    async getTask(taskId: string): Promise<A2ATask | null> {
        const table = this.readTable('a2a_tasks')
        const row = table[taskId]
        return row ? (row as unknown as A2ATask) : null
    }

    async updateTaskStatus(taskId: string, status: TaskStatus, _metadata?: Record<string, unknown>): Promise<void> {
        const table = this.readTable('a2a_tasks')
        const task = table[taskId]
        if (!task) throw new Error(`Task ${taskId} not found`)
        validateTaskTransition(task.status as TaskStatus, status)
        task.status = status
        this.writeTable('a2a_tasks', table)
    }

    async listTasks(filter: Record<string, unknown>): Promise<A2ATask[]> {
        const table = this.readTable('a2a_tasks')
        const tasks = Object.values(table) as unknown as A2ATask[]
        return tasks.filter((t) => {
            if (filter.status && t.status !== filter.status) return false
            if (filter.agentId && typeof filter.agentId === 'string') {
                if (t.requesterId !== filter.agentId && t.assigneeId !== filter.agentId) return false
            }
            if (filter.ownerId && typeof filter.ownerId === 'string') {
                if (t.requesterId !== filter.ownerId) return false
            }
            return true
        })
    }

    // ── Message ──

    async sendMessage(message: A2AMessage): Promise<string> {
        const table = this.readTable('a2a_messages')
        const id = message.id || this.uuid()
        const row = { ...message, id } as RowObject
        table[id] = row
        this.writeTable('a2a_messages', table)
        return id
    }

    async getMessages(taskId: string, _limit?: number): Promise<A2AMessage[]> {
        const table = this.readTable('a2a_messages')
        const all = Object.values(table) as unknown as A2AMessage[]
        return all.filter((m) => m.taskId === taskId)
    }

    // ── Artifact ──

    async registerArtifact(artifact: A2AArtifact): Promise<string> {
        const table = this.readTable('a2a_artifacts')
        const id = artifact.id || this.uuid()
        const row = { ...artifact, id, permissions: { ...(artifact.permissions ?? {}) } } as RowObject
        table[id] = row
        this.writeTable('a2a_artifacts', table)
        return id
    }

    async getArtifact(artifactId: string): Promise<A2AArtifact | null> {
        const table = this.readTable('a2a_artifacts')
        const row = table[artifactId]
        return row ? (row as unknown as A2AArtifact) : null
    }

    async listArtifacts(taskId?: string, ownerId?: string): Promise<A2AArtifact[]> {
        const table = this.readTable('a2a_artifacts')
        const all = Object.values(table) as unknown as A2AArtifact[]
        return all.filter((a) => {
            if (taskId && a.taskId !== taskId) return false
            if (ownerId && a.ownerId !== ownerId) return false
            return true
        })
    }

    async grantAccess(artifactId: string, agentId: string, permission: ArtifactPermission, _grantedBy: string): Promise<void> {
        const table = this.readTable('a2a_artifacts')
        const artifact = table[artifactId]
        if (!artifact) throw new Error(`Artifact ${artifactId} not found`)
        const perms = (artifact.permissions ?? {}) as Record<string, string>
        perms[agentId] = permission
        artifact.permissions = perms
        this.writeTable('a2a_artifacts', table)
    }

    async revokeAccess(artifactId: string, agentId: string): Promise<void> {
        const table = this.readTable('a2a_artifacts')
        const artifact = table[artifactId]
        if (!artifact) return
        const perms = (artifact.permissions ?? {}) as Record<string, string>
        delete perms[agentId]
        artifact.permissions = perms
        this.writeTable('a2a_artifacts', table)
    }

    async checkAccess(artifactId: string, agentId: string): Promise<ArtifactPermission | null> {
        const table = this.readTable('a2a_artifacts')
        const artifact = table[artifactId]
        if (!artifact) return null
        const perms = (artifact.permissions ?? {}) as Record<string, string>
        return (perms[agentId] as ArtifactPermission) ?? null
    }

    // ── Shared Context ──

    async createSession(session: A2ASession): Promise<string> {
        const table = this.readTable('a2a_sessions')
        const id = session.id || this.uuid()
        const row = { ...session, id } as RowObject
        table[id] = row
        this.writeTable('a2a_sessions', table)
        return id
    }

    async getSession(sessionId: string): Promise<A2ASession | null> {
        const table = this.readTable('a2a_sessions')
        const row = table[sessionId]
        return row ? (row as unknown as A2ASession) : null
    }

    async addClaim(sessionId: string, claim: A2AClaim): Promise<string> {
        const table = this.readTable('a2a_claims')
        const id = claim.id || this.uuid()
        const row = { ...claim, id, sessionId } as RowObject
        table[id] = row
        this.writeTable('a2a_claims', table)
        return id
    }

    async getClaims(sessionId: string): Promise<A2AClaim[]> {
        const table = this.readTable('a2a_claims')
        const all = Object.values(table) as unknown as A2AClaim[]
        return all.filter((c) => c.sessionId === sessionId)
    }

    async addObservation(sessionId: string, obs: A2AObservation): Promise<string> {
        const table = this.readTable('a2a_observations')
        const id = obs.id || this.uuid()
        const row = { ...obs, id, sessionId } as RowObject
        table[id] = row
        this.writeTable('a2a_observations', table)
        return id
    }

    async addDecision(sessionId: string, decision: A2ADecision): Promise<string> {
        const table = this.readTable('a2a_decisions')
        const id = decision.id || this.uuid()
        const row = { ...decision, id, sessionId } as RowObject
        table[id] = row
        this.writeTable('a2a_decisions', table)
        return id
    }

    async getDecisions(sessionId: string): Promise<A2ADecision[]> {
        const table = this.readTable('a2a_decisions')
        const all = Object.values(table) as unknown as A2ADecision[]
        return all.filter((d) => d.sessionId === sessionId)
    }

    // ── Memory ──

    async saveContext(agentId: string, key: string, value: unknown): Promise<void> {
        const table = this.readTable('a2a_context')
        const ctxKey = `${agentId}:${key}`
        table[ctxKey] = value as RowObject
        this.writeTable('a2a_context', table)
    }

    async loadContext(agentId: string, key: string): Promise<unknown | null> {
        const table = this.readTable('a2a_context')
        const ctxKey = `${agentId}:${key}`
        const value = table[ctxKey]
        return value !== undefined ? value : null
    }
}
