import path from 'path'
import { executeAgentFlow } from './buildAgentflow'

type StoredEntity = Record<string, any>

const WORKSPACE_ID = 'workspace-1'
const SESSION_ID = 'session-1'
const CHAT_ID = 'chat-1'

class MemoryRepository {
    private rows: StoredEntity[] = []
    private nextId = 1

    constructor(initialRows: StoredEntity[] = []) {
        this.rows = initialRows
    }

    create(entity: StoredEntity) {
        return { ...entity }
    }

    merge(target: StoredEntity, source: StoredEntity) {
        Object.assign(target, source)
        return target
    }

    async save(entity: StoredEntity) {
        if (!entity.id) entity.id = `entity-${this.nextId++}`
        const existingIndex = this.rows.findIndex((row) => row.id === entity.id)
        if (existingIndex >= 0) {
            this.rows[existingIndex] = { ...this.rows[existingIndex], ...entity }
            return this.rows[existingIndex]
        }
        const row = { ...entity, createdDate: entity.createdDate ?? new Date(this.nextId) }
        this.rows.push(row)
        return row
    }

    async find(options?: { where?: Record<string, any>; order?: Record<string, 'ASC' | 'DESC'> }) {
        let result = [...this.rows]
        if (options?.where) {
            result = result.filter((row) =>
                Object.entries(options.where ?? {}).every(([key, value]) => value === undefined || row[key] === value)
            )
        }
        if (options?.order?.createdDate === 'DESC') {
            result.sort((a, b) => Number(b.createdDate ?? 0) - Number(a.createdDate ?? 0))
        }
        return result
    }

    async findBy() {
        return [...this.rows]
    }

    async findOneBy(where: Record<string, any>) {
        return this.rows.find((row) => Object.entries(where).every(([key, value]) => row[key] === value))
    }

    async findOne(options: { where?: Record<string, any> }) {
        if (!options.where) return this.rows[0]
        return this.findOneBy(options.where)
    }

    createQueryBuilder() {
        return {
            where: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([])
        }
    }
}

const makeDataSource = () => {
    const executionRepository = new MemoryRepository()
    const chatMessageRepository = new MemoryRepository()
    const variableRepository = new MemoryRepository()

    return {
        executionRepository,
        getRepository: (entity: { name?: string }) => {
            if (entity.name === 'Execution') return executionRepository
            if (entity.name === 'ChatMessage') return chatMessageRepository
            if (entity.name === 'Variable') return variableRepository
            throw new Error(`Unexpected repository: ${entity.name}`)
        }
    }
}

const makeNode = (id: string, name: string, label: string, testOutput?: Record<string, any>) => ({
    id,
    type: 'agentflowNode',
    position: { x: 0, y: 0 },
    data: {
        id,
        name,
        label,
        inputs: {
            startInputType: name === 'startAgentflow' ? 'chatInput' : undefined,
            testOutput
        },
        inputParams: []
    }
})

const makeEdge = (source: string, target: string, outputIndex = 0) => ({
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle: `${source}-output-${outputIndex}`,
    targetHandle: `${target}-input-0`
})

describe('executeAgentFlow converging conditional paths', () => {
    const fixturePath = path.join(__dirname, '__fixtures__', 'agentflowTestNode.js')
    const componentNodes = {
        startAgentflow: { filePath: fixturePath },
        conditionAgentflow: { filePath: fixturePath },
        humanInputAgentflow: { filePath: fixturePath },
        llmAgentflow: { filePath: fixturePath }
    } as any

    const baseRuntimeParams = {
        componentNodes,
        chatId: CHAT_ID,
        evaluationRunId: undefined,
        telemetry: { sendTelemetry: jest.fn().mockResolvedValue(undefined) } as any,
        usageCacheManager: {} as any,
        cachePool: {} as any,
        sseStreamer: undefined,
        baseURL: '',
        isInternal: false,
        orgId: 'org-1',
        workspaceId: WORKSPACE_ID,
        subscriptionId: 'sub-1',
        productId: 'product-1'
    }

    it('continues to a downstream merge node after resuming a human-input branch', async () => {
        const dataSource = makeDataSource()
        const conditionId = 'conditionAgentflow_0'
        const humanId = 'humanInputAgentflow_0'
        const mergeId = 'llmAgentflow_merge'

        const nodes = [
            makeNode('startAgentflow_0', 'startAgentflow', 'Start', { content: 'start' }),
            makeNode(conditionId, 'conditionAgentflow', 'Condition', {
                conditions: [
                    { type: 'string', value1: 'x', operation: 'notEmpty', isFulfilled: true },
                    { type: 'string', value1: '', operation: 'isEmpty', isFulfilled: false }
                ],
                content: 'condition selected human branch'
            }),
            makeNode(humanId, 'humanInputAgentflow', 'Human Input', {
                conditions: [{ type: 'approve', isFulfilled: true }],
                content: 'human approved'
            }),
            makeNode(mergeId, 'llmAgentflow', 'Merge Node', { content: 'merge executed' })
        ]
        const edges = [
            makeEdge('startAgentflow_0', conditionId),
            makeEdge(conditionId, humanId, 0),
            makeEdge(conditionId, mergeId, 1),
            makeEdge(humanId, mergeId, 0)
        ]
        const chatflow = {
            id: 'flow-1',
            name: 'Converging human flow',
            flowData: JSON.stringify({ nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } }),
            workspaceId: WORKSPACE_ID
        } as any

        const firstRun = await executeAgentFlow({
            ...baseRuntimeParams,
            appDataSource: dataSource as any,
            chatflow,
            incomingInput: {
                question: 'start',
                overrideConfig: { sessionId: SESSION_ID }
            }
        } as any)

        expect(firstRun.agentFlowExecutedData.map((data: any) => data.nodeId)).toEqual(['startAgentflow_0', conditionId, humanId])
        expect(firstRun.agentFlowExecutedData.at(-1).status).toBe('STOPPED')

        const resumedRun = await executeAgentFlow({
            ...baseRuntimeParams,
            appDataSource: dataSource as any,
            chatflow,
            incomingInput: {
                question: 'resume',
                overrideConfig: { sessionId: SESSION_ID },
                humanInput: {
                    startNodeId: humanId,
                    type: 'approve',
                    feedback: 'approved'
                }
            }
        } as any)

        expect(resumedRun.agentFlowExecutedData.map((data: any) => data.nodeId)).toContain(mergeId)
        expect(resumedRun.text).toBe('merge executed')
    })
})
