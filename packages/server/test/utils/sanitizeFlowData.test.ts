import { sanitizeFlowDataForPublicEndpoint } from '../../src/utils/sanitizeFlowData'

const makeFlowData = (nodes: object[], edges: object[] = []) => JSON.stringify({ nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } })

const makeNode = (inputs: Record<string, unknown>, inputParams: object[], extra: object = {}) => ({
    id: 'node_0',
    position: { x: 0, y: 0 },
    type: 'customNode',
    data: {
        id: 'node_0',
        name: 'testNode',
        label: 'Test Node',
        inputs,
        inputParams,
        ...extra
    }
})

export function sanitizeFlowDataTest() {
    describe('sanitizeFlowDataForPublicEndpoint', () => {
        it('strips password-type inputs', () => {
            const flowData = makeFlowData([
                makeNode({ apiKey: 'sk-secret', model: 'gpt-4' }, [
                    { name: 'apiKey', type: 'password' },
                    { name: 'model', type: 'string' }
                ])
            ])
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint(flowData))
            expect(result.nodes[0].data.inputs).not.toHaveProperty('apiKey')
            expect(result.nodes[0].data.inputs.model).toBe('gpt-4')
        })

        it('strips file-type inputs', () => {
            const flowData = makeFlowData([
                makeNode({ filePath: '/data/secret.pdf', label: 'loader' }, [
                    { name: 'filePath', type: 'file' },
                    { name: 'label', type: 'string' }
                ])
            ])
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint(flowData))
            expect(result.nodes[0].data.inputs).not.toHaveProperty('filePath')
            expect(result.nodes[0].data.inputs.label).toBe('loader')
        })

        it('strips folder-type inputs', () => {
            const flowData = makeFlowData([
                makeNode({ folderPath: '/home/user/docs', name: 'ingest' }, [
                    { name: 'folderPath', type: 'folder' },
                    { name: 'name', type: 'string' }
                ])
            ])
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint(flowData))
            expect(result.nodes[0].data.inputs).not.toHaveProperty('folderPath')
            expect(result.nodes[0].data.inputs.name).toBe('ingest')
        })

        it('removes credential field from node data', () => {
            const flowData = makeFlowData([
                makeNode({ model: 'gpt-4' }, [{ name: 'model', type: 'string' }], { credential: 'cred-uuid-123' })
            ])
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint(flowData))
            expect(result.nodes[0].data).not.toHaveProperty('credential')
        })

        it('removes Authorization header from headers input, preserves other headers', () => {
            const headers = JSON.stringify({ Authorization: 'Bearer secret-token', 'Content-Type': 'application/json' })
            const flowData = makeFlowData([
                makeNode({ headers, url: 'https://example.com' }, [
                    { name: 'headers', type: 'json' },
                    { name: 'url', type: 'string' }
                ])
            ])
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint(flowData))
            const sanitizedHeaders = JSON.parse(result.nodes[0].data.inputs.headers)
            expect(sanitizedHeaders).not.toHaveProperty('Authorization')
            expect(sanitizedHeaders['Content-Type']).toBe('application/json')
        })

        it('removes x-api-key header case-insensitively', () => {
            const headers = JSON.stringify({ 'X-API-Key': 'my-key', Accept: 'application/json' })
            const flowData = makeFlowData([makeNode({ headers }, [{ name: 'headers', type: 'json' }])])
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint(flowData))
            const sanitizedHeaders = JSON.parse(result.nodes[0].data.inputs.headers)
            expect(sanitizedHeaders).not.toHaveProperty('X-API-Key')
            expect(sanitizedHeaders.Accept).toBe('application/json')
        })

        it('removes Authorization from array-format headers (HTTP agentflow node)', () => {
            const headers = [
                { key: 'Authorization', value: 'Bearer secret-token' },
                { key: 'Content-Type', value: 'application/json' }
            ]
            const flowData = makeFlowData([makeNode({ headers }, [{ name: 'headers', type: 'array' }])])
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint(flowData))
            const sanitizedHeaders = result.nodes[0].data.inputs.headers
            expect(sanitizedHeaders).toEqual([{ key: 'Content-Type', value: 'application/json' }])
        })

        it('removes x-api-key case-insensitively from array-format headers', () => {
            const headers = [
                { key: 'X-API-Key', value: 'secret' },
                { key: 'Accept', value: 'application/json' }
            ]
            const flowData = makeFlowData([makeNode({ headers }, [{ name: 'headers', type: 'array' }])])
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint(flowData))
            const sanitizedHeaders = result.nodes[0].data.inputs.headers
            expect(sanitizedHeaders).toEqual([{ key: 'Accept', value: 'application/json' }])
        })

        it('preserves non-sensitive string inputs unchanged', () => {
            const flowData = makeFlowData([
                makeNode({ temperature: '0.7', maxTokens: '1024' }, [
                    { name: 'temperature', type: 'string' },
                    { name: 'maxTokens', type: 'number' }
                ])
            ])
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint(flowData))
            expect(result.nodes[0].data.inputs.temperature).toBe('0.7')
            expect(result.nodes[0].data.inputs.maxTokens).toBe('1024')
        })

        it('preserves startAgentflow node inputs used by the embed widget', () => {
            const formInputTypes = [{ name: 'email', type: 'string', label: 'Email' }]
            const flowData = makeFlowData([
                makeNode(
                    { startInputType: 'formInput', formTitle: 'Contact Us', formDescription: 'Fill out the form', formInputTypes },
                    [
                        { name: 'startInputType', type: 'options' },
                        { name: 'formTitle', type: 'string' },
                        { name: 'formDescription', type: 'string' },
                        { name: 'formInputTypes', type: 'datagrid' }
                    ],
                    { name: 'startAgentflow' }
                )
            ])
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint(flowData))
            const inputs = result.nodes[0].data.inputs
            expect(inputs.startInputType).toBe('formInput')
            expect(inputs.formTitle).toBe('Contact Us')
            expect(inputs.formDescription).toBe('Fill out the form')
            expect(inputs.formInputTypes).toEqual(formInputTypes)
        })

        it('returns empty nodes/edges structure for malformed flowData', () => {
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint('not-valid-json'))
            expect(result).toEqual({ nodes: [], edges: [] })
        })

        it('returns the original string unchanged when flowDataString is empty', () => {
            expect(sanitizeFlowDataForPublicEndpoint('')).toBe('')
        })

        it('does not crash when a node has no inputParams', () => {
            const flowData = makeFlowData([{ id: 'n0', type: 'x', data: { inputs: { foo: 'bar' } } }])
            expect(() => sanitizeFlowDataForPublicEndpoint(flowData)).not.toThrow()
            const result = JSON.parse(sanitizeFlowDataForPublicEndpoint(flowData))
            expect(result.nodes[0].data.inputs.foo).toBe('bar')
        })
    })
}
