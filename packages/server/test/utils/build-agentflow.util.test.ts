import { constructGraphs, getStartingNode } from '../../src/utils'
import { __test__ } from '../../src/utils/buildAgentflow'

const createNode = (id: string, name: string) =>
    ({
        id,
        position: { x: 0, y: 0 },
        type: 'default',
        data: {
            id,
            label: name,
            name,
            category: 'test',
            inputs: {},
            outputs: {},
            summary: '',
            description: '',
            inputAnchors: [],
            inputParams: [],
            outputAnchors: []
        } as any,
        positionAbsolute: { x: 0, y: 0 },
        z: 0,
        handleBounds: { source: [], target: [] },
        width: 0,
        height: 0,
        selected: false,
        dragging: false
    })

const createEdge = (source: string, target: string) => ({
    source,
    sourceHandle: 'output',
    target,
    targetHandle: 'input',
    type: 'default',
    id: `${source}->${target}`,
    data: { label: '' }
})

describe('buildAgentflow utils', () => {
    it('filters out starting nodes that are not connected to startAgentflow', () => {
        const startNode = createNode('start-node', 'startAgentflow')
        const connectedNode = createNode('connected-node', 'Agent')
        const disconnectedNode = createNode('floating-node', 'LLM')

        const nodes = [startNode, connectedNode, disconnectedNode]
        const edges = [createEdge(startNode.id, connectedNode.id)]

        const { graph, nodeDependencies } = constructGraphs(nodes, edges)
        const { startingNodeIds } = getStartingNode(nodeDependencies)

        expect(startingNodeIds).toEqual(expect.arrayContaining([startNode.id, disconnectedNode.id]))

        const filteredStartingNodeIds = __test__.filterDisconnectedStartingNodes(startingNodeIds, graph, nodes)

        expect(filteredStartingNodeIds).toContain(startNode.id)
        expect(filteredStartingNodeIds).not.toContain(disconnectedNode.id)
    })
})

export const buildAgentflowTest = () => {
    // Tests are registered at import time for compatibility with existing index runner.
}
