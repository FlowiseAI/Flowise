import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

jest.mock('flowise-components', () => ({ tracingEnvEnabled: () => false }), { virtual: true })
jest.mock('./logger', () => ({ __esModule: true, default: { debug: jest.fn(), error: jest.fn() } }))
jest.mock('./buildChatflow', () => ({ shouldAutoPlayTTS: () => false }))
jest.mock('./addChatMesage', () => ({ utilAddChatMessage: async (message: any) => message }))
jest.mock('../enterprise/utils/ControllerServiceUtils', () => ({ getWorkspaceSearchOptions: () => ({}) }))
jest.mock('.', () => ({
    constructGraphs: (nodes: any[], edges: any[], options: { isReversed?: boolean } = {}) => {
        const graph: Record<string, string[]> = Object.fromEntries(nodes.map((node) => [node.id, []]))
        const nodeDependencies: Record<string, number> = Object.fromEntries(nodes.map((node) => [node.id, 0]))
        for (const edge of edges) {
            graph[options.isReversed ? edge.target : edge.source].push(options.isReversed ? edge.source : edge.target)
            nodeDependencies[edge.target]++
        }
        return { graph, nodeDependencies }
    },
    getStartingNode: (dependencies: Record<string, number>) => ({
        startingNodeIds: Object.keys(dependencies).filter((id) => dependencies[id] === 0)
    }),
    getAPIOverrideConfig: () => ({}),
    _removeCredentialId: (data: any) => data,
    getAppVersion: async () => 'test',
    getTelemetryFlowObj: () => ({})
}))

import { executeAgentFlow } from './buildAgentflow'

/** Exercise the real engine and node loading; storage and telemetry are in-memory test adapters. */
describe('executeAgentFlow history', () => {
    const directory = mkdtempSync(join(tmpdir(), 'flowise-history-'))
    const filePath = join(directory, 'node.cjs')

    beforeAll(() => {
        writeFileSync(
            filePath,
            `exports.nodeClass = class {
                async run(data) {
                    return { output: { content: data.label } }
                }
            }`
        )
    })
    afterAll(() => rmSync(directory, { recursive: true, force: true }))

    async function runFlow(parallel: boolean) {
        const ids = parallel ? ['start', 'left', 'right', 'join'] : ['start', 'left', 'join']
        const nodes = ids.map((id) => ({
            id,
            data: {
                id,
                label: id,
                name: id === 'start' ? 'startAgentflow' : 'directReplyAgentflow',
                inputs: id === 'start' ? { startInputType: 'chatInput' } : {},
                inputParams: []
            }
        }))
        const connections = parallel
            ? [
                  ['start', 'left'],
                  ['start', 'right'],
                  ['left', 'join'],
                  ['right', 'join']
              ]
            : [
                  ['start', 'left'],
                  ['left', 'join']
              ]
        const edges = connections.map(([source, target]) => ({ source, target, sourceHandle: `${source}-output-0` }))
        let execution: any
        const repository = {
            find: async () => [],
            findBy: async () => [],
            findOneBy: async () => execution,
            create: (data: any) => data,
            merge: (target: any, data: any) => Object.assign(target, data),
            save: async (data: any) => (execution = { id: 'execution-1', ...data })
        }
        const result = await executeAgentFlow({
            chatflow: { id: 'flow-1', flowData: JSON.stringify({ nodes, edges }) },
            componentNodes: { startAgentflow: { filePath }, directReplyAgentflow: { filePath } },
            appDataSource: { getRepository: () => repository },
            incomingInput: { question: 'Run the flow' },
            chatId: 'chat-1',
            telemetry: { sendTelemetry: async () => {} },
            workspaceId: 'workspace-1'
        } as any)
        return { result, execution, ids }
    }

    it('preserves both parallel branches in the returned and persisted execution history', async () => {
        const { result, execution, ids } = await runFlow(true)
        expect(result.agentFlowExecutedData.map((entry: any) => entry.nodeId)).toEqual(ids)
        expect(JSON.parse(execution.executionData).map((entry: any) => entry.nodeId)).toEqual(ids)
        expect(execution.state).toBe('FINISHED')
    })

    it('preserves a sequential flow history without duplicating its prefix', async () => {
        const { result, execution, ids } = await runFlow(false)
        expect(result.agentFlowExecutedData.map((entry: any) => entry.nodeId)).toEqual(ids)
        expect(JSON.parse(execution.executionData).map((entry: any) => entry.nodeId)).toEqual(ids)
    })
})
