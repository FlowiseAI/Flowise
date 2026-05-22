import { getExecutableFlowData, isNodeDisabled } from './index'
import type { IReactFlowEdge, IReactFlowNode } from '../Interface'

const makeNode = (id: string, disabled?: boolean): IReactFlowNode =>
    ({
        id,
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
            id,
            name: id,
            label: id,
            disabled,
            inputs: {},
            inputParams: [],
            inputAnchors: [],
            outputAnchors: []
        }
    } as unknown as IReactFlowNode)

const makeEdge = (source: string, target: string): IReactFlowEdge =>
    ({
        id: `${source}-${target}`,
        source,
        target,
        sourceHandle: source,
        targetHandle: target,
        type: 'buttonedge',
        data: { label: '' }
    } as IReactFlowEdge)

describe('disabled node runtime filtering', () => {
    it('detects disabled nodes', () => {
        expect(isNodeDisabled(makeNode('a', true))).toBe(true)
        expect(isNodeDisabled(makeNode('a', false))).toBe(false)
    })

    it('removes disabled nodes, their downstream nodes, and connected edges from executable flow data', () => {
        const nodes = [makeNode('start'), makeNode('expensive', true), makeNode('condition'), makeNode('http0'), makeNode('http1')]
        const edges = [
            makeEdge('start', 'expensive'),
            makeEdge('expensive', 'condition'),
            makeEdge('condition', 'http0'),
            makeEdge('condition', 'http1')
        ]

        const result = getExecutableFlowData(nodes, edges)

        expect(result.nodes.map((node) => node.id)).toEqual(['start'])
        expect(result.edges).toEqual([])
        expect(Array.from(result.disabledNodeIds)).toEqual(['expensive', 'condition', 'http0', 'http1'])
    })

    it('removes input references to disabled nodes from remaining executable nodes', () => {
        const disabled = makeNode('disabled', true)
        const target = makeNode('target')
        target.data.inputs = {
            model: '{{disabled.data.instance}}',
            tools: ['{{disabled.data.instance}}', '{{active.data.instance}}'],
            prompt: 'before {{disabled.data.instance.value}} after'
        }

        const result = getExecutableFlowData([makeNode('active'), disabled, target], [makeEdge('active', 'target')])
        const targetNode = result.nodes.find((node) => node.id === 'target')

        expect(targetNode?.data.inputs).toEqual({
            model: '',
            tools: ['{{active.data.instance}}'],
            prompt: 'before  after'
        })
    })
})
