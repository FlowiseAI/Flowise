import { validateFlowData, IValidationResult } from './index'
import type { IComponentNodes, IReactFlowNode, IReactFlowEdge } from '../../Interface'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeNode = (id: string, name: string, inputParams: any[] = [], inputs: Record<string, any> = {}, label?: string): IReactFlowNode =>
    ({
        id,
        data: { name, label: label ?? name, inputParams, inputs }
    } as unknown as IReactFlowNode)

const makeEdge = (source: string, target: string): IReactFlowEdge =>
    ({
        id: `e-${source}-${target}`,
        source,
        target,
        sourceHandle: '',
        targetHandle: '',
        type: 'default',
        data: { label: '' }
    } as IReactFlowEdge)

const emptyComponentNodes: IComponentNodes = {}

const issuesFor = (results: IValidationResult[], nodeId: string): string[] => {
    return results.find((r) => r.id === nodeId)?.issues ?? []
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateFlowData', () => {
    it('returns empty array for a valid connected flow', () => {
        const nodes = [
            makeNode('n1', 'chatAgent', [{ name: 'model', label: 'Model', optional: true }], { model: 'gpt-4' }),
            makeNode('n2', 'llm', [{ name: 'key', label: 'Key', optional: true }], { key: 'abc' })
        ]
        const edges = [makeEdge('n1', 'n2')]
        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(results).toEqual([])
    })

    // --- Unconnected nodes ---

    it('flags an unconnected node', () => {
        const nodes = [makeNode('n1', 'chatAgent'), makeNode('n2', 'llm')]
        const edges = [makeEdge('n1', 'n2')]
        const orphan = makeNode('n3', 'tool')
        nodes.push(orphan)

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(issuesFor(results, 'n3')).toContain('This node is not connected to anything')
    })

    it('skips stickyNoteAgentflow nodes', () => {
        const nodes = [makeNode('n1', 'stickyNoteAgentflow')]
        const results = validateFlowData(nodes, [], emptyComponentNodes)
        expect(results).toEqual([])
    })

    // --- Required parameters ---

    it('flags missing required parameter', () => {
        const nodes = [makeNode('n1', 'chatAgent', [{ name: 'model', label: 'Model' }], {})]
        const edges = [makeEdge('n1', 'n1')]

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(issuesFor(results, 'n1')).toContain('Model is required')
    })

    it('does not flag optional parameter', () => {
        const nodes = [makeNode('n1', 'chatAgent', [{ name: 'model', label: 'Model', optional: true }], {})]
        const edges = [makeEdge('n1', 'n1')]

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(results).toEqual([])
    })

    it('flags empty string as missing', () => {
        const nodes = [makeNode('n1', 'chatAgent', [{ name: 'model', label: 'Model' }], { model: '' })]
        const edges = [makeEdge('n1', 'n1')]

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(issuesFor(results, 'n1')).toContain('Model is required')
    })

    // --- Show / Hide conditions ---

    it('skips validation when show condition is not met', () => {
        const nodes = [
            makeNode(
                'n1',
                'api',
                [{ name: 'body', label: 'Body', show: { bodyType: 'raw' } }],
                { bodyType: 'formData' } // show condition NOT met
            )
        ]
        const edges = [makeEdge('n1', 'n1')]

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(results).toEqual([])
    })

    it('validates when show condition is met', () => {
        const nodes = [makeNode('n1', 'api', [{ name: 'body', label: 'Body', show: { bodyType: 'raw' } }], { bodyType: 'raw' })]
        const edges = [makeEdge('n1', 'n1')]

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(issuesFor(results, 'n1')).toContain('Body is required')
    })

    it('skips validation when hide condition is met', () => {
        const nodes = [makeNode('n1', 'api', [{ name: 'body', label: 'Body', hide: { bodyType: 'none' } }], { bodyType: 'none' })]
        const edges = [makeEdge('n1', 'n1')]

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(results).toEqual([])
    })

    // --- Credential requirements ---

    it('flags missing required credential', () => {
        const nodes = [makeNode('n1', 'chatAgent', [{ name: 'credential', label: 'Credential' }], {})]
        const edges = [makeEdge('n1', 'n1')]

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(issuesFor(results, 'n1')).toContain('Credential is required')
    })

    // --- Array type parameters ---

    it('flags missing required fields in array items', () => {
        const nodes = [
            makeNode(
                'n1',
                'conditionAgent',
                [
                    {
                        name: 'conditions',
                        label: 'Conditions',
                        type: 'array',
                        optional: true,
                        array: [{ name: 'field', label: 'Field' }]
                    }
                ],
                { conditions: [{ field: '' }] }
            )
        ]
        const edges = [makeEdge('n1', 'n1')]

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(issuesFor(results, 'n1')).toContain('Conditions item #1: Field is required')
    })

    // --- Nested config parameters ---

    it('flags missing required nested config fields', () => {
        const componentNodes: IComponentNodes = {
            openAIEmbeddings: {
                inputs: [{ name: 'apiKey', label: 'API Key' }]
            } as any
        }
        const nodes = [
            makeNode('n1', 'vectorStore', [{ name: 'embedding', label: 'Embedding' }], {
                embedding: 'openAIEmbeddings',
                embeddingConfig: {}
            })
        ]
        const edges = [makeEdge('n1', 'n1')]

        const results = validateFlowData(nodes, edges, componentNodes)
        expect(issuesFor(results, 'n1')).toContain('Embedding configuration: API Key is required')
    })

    it('flags missing credential in nested component', () => {
        const componentNodes: IComponentNodes = {
            openAIEmbeddings: {
                inputs: [],
                credential: { name: 'credential', label: 'Credential' }
            } as any
        }
        const nodes = [
            makeNode('n1', 'vectorStore', [{ name: 'embedding', label: 'Embedding' }], {
                embedding: 'openAIEmbeddings',
                embeddingConfig: {}
            })
        ]
        const edges = [makeEdge('n1', 'n1')]

        const results = validateFlowData(nodes, edges, componentNodes)
        expect(issuesFor(results, 'n1')).toContain('Embedding requires a credential')
    })

    // --- Hanging edges ---

    it('flags edge with non-existent source', () => {
        const nodes = [makeNode('n2', 'llm')]
        const edges = [makeEdge('ghost', 'n2')]

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(issuesFor(results, 'n2')).toContain('Connected to non-existent source node ghost')
    })

    it('flags edge with non-existent target', () => {
        const nodes = [makeNode('n1', 'chatAgent')]
        const edges = [makeEdge('n1', 'ghost')]

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        expect(issuesFor(results, 'n1')).toContain('Connected to non-existent target node ghost')
    })

    it('flags edge where both source and target are missing', () => {
        const nodes = [makeNode('n1', 'chatAgent')]
        const edges = [makeEdge('n1', 'n1'), makeEdge('ghostA', 'ghostB')]

        const results = validateFlowData(nodes, edges, emptyComponentNodes)
        const edgeResult = results.find((r) => r.name === 'edge')
        expect(edgeResult).toBeDefined()
        expect(edgeResult!.issues).toContain('Disconnected edge - both source and target nodes do not exist')
    })

    // --- Multiple issues on one node ---

    it('collects multiple issues on the same node', () => {
        const nodes = [
            makeNode(
                'n1',
                'chatAgent',
                [
                    { name: 'model', label: 'Model' },
                    { name: 'temperature', label: 'Temperature' }
                ],
                {}
            )
        ]
        // n1 is not connected + has 2 missing required params
        const results = validateFlowData(nodes, [], emptyComponentNodes)
        const issues = issuesFor(results, 'n1')
        expect(issues).toContain('This node is not connected to anything')
        expect(issues).toContain('Model is required')
        expect(issues).toContain('Temperature is required')
    })
})
