import { MetricType } from '@zilliz/milvus2-sdk-node'

// getBaseClasses(Milvus) is called in the node constructor; stub the utils module
// so the test does not pull the full src/utils dependency graph.
jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn(() => ['Milvus', 'VectorStore']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn(),
    FLOWISE_CHATID: 'chatId'
}))

const { nodeClass: Milvus_VectorStores, resolveMilvusMetricType } = require('./Milvus')

describe('Milvus resolveMilvusMetricType', () => {
    it('maps L2 (any case) to MetricType.L2', () => {
        expect(resolveMilvusMetricType('L2')).toBe(MetricType.L2)
        expect(resolveMilvusMetricType('l2')).toBe(MetricType.L2)
    })

    it('maps COSINE (any case) to MetricType.COSINE', () => {
        expect(resolveMilvusMetricType('COSINE')).toBe(MetricType.COSINE)
        expect(resolveMilvusMetricType('cosine')).toBe(MetricType.COSINE)
        expect(resolveMilvusMetricType(' Cosine ')).toBe(MetricType.COSINE)
    })

    it('maps IP (any case) to MetricType.IP', () => {
        expect(resolveMilvusMetricType('IP')).toBe(MetricType.IP)
        expect(resolveMilvusMetricType('ip')).toBe(MetricType.IP)
    })

    it('falls back to L2 for empty, undefined, or unknown input (backward compatible)', () => {
        expect(resolveMilvusMetricType(undefined)).toBe(MetricType.L2)
        expect(resolveMilvusMetricType('')).toBe(MetricType.L2)
        expect(resolveMilvusMetricType('HAMMING')).toBe(MetricType.L2)
    })
})

describe('Milvus node Metric Type input', () => {
    let node: any

    beforeEach(() => {
        node = new Milvus_VectorStores()
    })

    it('exposes a metricType options input with L2/COSINE/IP and an L2 default', () => {
        const input = node.inputs.find((i: any) => i.name === 'metricType')
        expect(input).toBeDefined()
        expect(input.type).toBe('options')
        expect(input.default).toBe('L2')
        const optionNames = input.options.map((o: any) => o.name)
        expect(optionNames).toEqual(['L2', 'COSINE', 'IP'])
    })

    it('keeps the metricType input optional so existing flows are unaffected', () => {
        const input = node.inputs.find((i: any) => i.name === 'metricType')
        expect(input.optional).toBe(true)
    })
})
