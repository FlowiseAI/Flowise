import { validateChatflowImportData } from './index'

describe('chatflowsService', () => {
    describe('validateChatflowImportData', () => {
        const validFlowData = JSON.stringify({
            nodes: [{ id: 'node_1', data: { name: 'chatOpenAI' } }],
            edges: [{ id: 'edge_1', source: 'node_1', target: 'node_2' }]
        })

        const validImportData = {
            name: 'Test Chatflow',
            flowData: validFlowData,
            type: 'CHATFLOW'
        }

        it('should accept valid import data', () => {
            expect(() => validateChatflowImportData(validImportData)).not.toThrow()
        })

        it('should accept valid data with all optional fields', () => {
            const fullData = {
                ...validImportData,
                deployed: true,
                isPublic: false,
                chatbotConfig: '{}',
                apiConfig: '{}',
                analytic: '{}',
                speechToText: '{}',
                textToSpeech: '{}',
                followUpPrompts: '{}',
                category: 'test'
            }
            expect(() => validateChatflowImportData(fullData)).not.toThrow()
        })

        it('should reject null body', () => {
            expect(() => validateChatflowImportData(null)).toThrow('Import data must be a JSON object')
        })

        it('should reject non-object body', () => {
            expect(() => validateChatflowImportData('string')).toThrow('Import data must be a JSON object')
        })

        it('should reject array body', () => {
            expect(() => validateChatflowImportData([1, 2, 3])).toThrow('Import data must be a JSON object')
        })

        it('should reject missing name', () => {
            const data = { flowData: validFlowData }
            expect(() => validateChatflowImportData(data)).toThrow('valid "name" string')
        })

        it('should reject non-string name', () => {
            const data = { name: 123, flowData: validFlowData }
            expect(() => validateChatflowImportData(data)).toThrow('valid "name" string')
        })

        it('should reject missing flowData', () => {
            const data = { name: 'Test' }
            expect(() => validateChatflowImportData(data)).toThrow('valid "flowData" string')
        })

        it('should reject non-string flowData', () => {
            const data = { name: 'Test', flowData: { nodes: [], edges: [] } }
            expect(() => validateChatflowImportData(data)).toThrow('valid "flowData" string')
        })

        it('should reject unparseable flowData JSON', () => {
            const data = { name: 'Test', flowData: 'not-json' }
            expect(() => validateChatflowImportData(data)).toThrow('must be valid JSON')
        })

        it('should reject flowData without nodes array', () => {
            const data = { name: 'Test', flowData: JSON.stringify({ edges: [] }) }
            expect(() => validateChatflowImportData(data)).toThrow('must contain a "nodes" array')
        })

        it('should reject flowData without edges array', () => {
            const data = { name: 'Test', flowData: JSON.stringify({ nodes: [] }) }
            expect(() => validateChatflowImportData(data)).toThrow('must contain an "edges" array')
        })

        it('should reject invalid type', () => {
            const data = { ...validImportData, type: 'INVALID' }
            expect(() => validateChatflowImportData(data)).toThrow('Invalid chatflow type')
        })

        it('should accept all valid chatflow types', () => {
            for (const type of ['CHATFLOW', 'AGENTFLOW', 'MULTIAGENT', 'ASSISTANT']) {
                expect(() => validateChatflowImportData({ ...validImportData, type })).not.toThrow()
            }
        })

        it('should reject non-string optional string fields', () => {
            const stringFields = ['chatbotConfig', 'apiConfig', 'analytic', 'speechToText', 'textToSpeech', 'followUpPrompts', 'category']
            for (const field of stringFields) {
                const data = { ...validImportData, [field]: 123 }
                expect(() => validateChatflowImportData(data)).toThrow(`"${field}" must be a string`)
            }
        })

        it('should reject non-boolean optional boolean fields', () => {
            for (const field of ['deployed', 'isPublic']) {
                const data = { ...validImportData, [field]: 'yes' }
                expect(() => validateChatflowImportData(data)).toThrow(`"${field}" must be a boolean`)
            }
        })

        it('should allow null optional fields', () => {
            const data = {
                ...validImportData,
                chatbotConfig: null,
                deployed: null,
                category: null
            }
            expect(() => validateChatflowImportData(data)).not.toThrow()
        })
    })
})
