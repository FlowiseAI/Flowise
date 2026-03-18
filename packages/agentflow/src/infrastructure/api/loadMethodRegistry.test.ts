import type { ApiServices } from './loadMethodRegistry'
import { getLoadMethod, loadMethodRegistry } from './loadMethodRegistry'

const mockApis: ApiServices = {
    chatModelsApi: {
        getChatModels: jest.fn()
    },
    toolsApi: {
        getAllTools: jest.fn(),
        getToolInputArgs: jest.fn()
    },
    credentialsApi: {
        getAllCredentials: jest.fn(),
        getCredentialsByName: jest.fn()
    },
    storesApi: {
        getStores: jest.fn(),
        getVectorStores: jest.fn()
    },
    embeddingsApi: {
        getEmbeddings: jest.fn()
    },
    runtimeStateApi: {
        getRuntimeStateKeys: jest.fn()
    },
    nodesApi: {
        getAllNodes: jest.fn(),
        getNodeByName: jest.fn(),
        getNodeIconUrl: jest.fn(),
        loadNodeMethod: jest.fn()
    }
}

beforeEach(() => {
    jest.clearAllMocks()
})

describe('loadMethodRegistry', () => {
    describe('listModels', () => {
        it('should call chatModelsApi.getChatModels() when no nodeName provided', async () => {
            const mockModels = [{ name: 'gpt-4', label: 'GPT-4' }]
            ;(mockApis.chatModelsApi.getChatModels as jest.Mock).mockResolvedValue(mockModels)

            const result = await loadMethodRegistry['listModels'](mockApis)
            expect(mockApis.chatModelsApi.getChatModels).toHaveBeenCalled()
            expect(result).toEqual(mockModels)
        })

        it('should call nodesApi.loadNodeMethod() when nodeName is provided', async () => {
            const mockBedrockModels = [{ name: 'anthropic.claude-3-haiku', label: 'Claude 3 Haiku' }]
            ;(mockApis.nodesApi.loadNodeMethod as jest.Mock).mockResolvedValue(mockBedrockModels)

            const result = await loadMethodRegistry['listModels'](mockApis, { nodeName: 'awsChatBedrock' })
            expect(mockApis.nodesApi.loadNodeMethod).toHaveBeenCalledWith('awsChatBedrock', 'listModels')
            expect(mockApis.chatModelsApi.getChatModels).not.toHaveBeenCalled()
            expect(result).toEqual(mockBedrockModels)
        })
    })

    describe('listTools', () => {
        it('should call toolsApi.getAllTools()', async () => {
            const mockTools = [{ id: '1', name: 'Calculator' }]
            ;(mockApis.toolsApi.getAllTools as jest.Mock).mockResolvedValue(mockTools)

            const result = await loadMethodRegistry['listTools'](mockApis)
            expect(mockApis.toolsApi.getAllTools).toHaveBeenCalled()
            expect(result).toEqual(mockTools)
        })
    })

    describe('listToolInputArgs', () => {
        it('should call toolsApi.getToolInputArgs() with inputs and nodeName from params', async () => {
            const mockArgs = [{ name: 'query', label: 'Query' }]
            ;(mockApis.toolsApi.getToolInputArgs as jest.Mock).mockResolvedValue(mockArgs)

            const result = await loadMethodRegistry['listToolInputArgs'](mockApis, {
                inputs: { toolAgentflowSelectedTool: 'calculator' },
                nodeName: 'toolAgentflow'
            })
            expect(mockApis.toolsApi.getToolInputArgs).toHaveBeenCalledWith({ toolAgentflowSelectedTool: 'calculator' }, 'toolAgentflow')
            expect(result).toEqual(mockArgs)
        })
    })

    describe('listRegions', () => {
        it('should call nodesApi.loadNodeMethod() with nodeName, listRegions, and currentNode.inputs', async () => {
            const mockRegions = [{ name: 'us-east-1', label: 'US East (N. Virginia)' }]
            ;(mockApis.nodesApi.loadNodeMethod as jest.Mock).mockResolvedValue(mockRegions)

            const fn = getLoadMethod('listRegions')
            const result = await fn(mockApis, { nodeName: 'awsChatBedrock' })
            expect(mockApis.nodesApi.loadNodeMethod).toHaveBeenCalledWith('awsChatBedrock', 'listRegions', {
                currentNode: { inputs: {} }
            })
            expect(result).toEqual(mockRegions)
        })

        it('should reject when nodeName param is missing', async () => {
            const fn = getLoadMethod('listRegions')
            await expect(fn(mockApis)).rejects.toThrow('loadMethod "listRegions" requires a string "nodeName" parameter.')
        })
    })

    describe('listActions', () => {
        it('should call nodesApi.loadNodeMethod() with nodeName, listActions, and currentNode.inputs', async () => {
            const mockActions = [{ name: 'GITHUB_CREATE_ISSUE', label: 'Create Issue' }]
            ;(mockApis.nodesApi.loadNodeMethod as jest.Mock).mockResolvedValue(mockActions)

            const fn = getLoadMethod('listActions')
            const result = await fn(mockApis, { nodeName: 'composio', inputs: { appName: 'github' } })
            expect(mockApis.nodesApi.loadNodeMethod).toHaveBeenCalledWith('composio', 'listActions', {
                currentNode: { inputs: { appName: 'github' } }
            })
            expect(result).toEqual(mockActions)
        })

        it('should pass empty inputs when inputs param is omitted', async () => {
            ;(mockApis.nodesApi.loadNodeMethod as jest.Mock).mockResolvedValue([])

            const fn = getLoadMethod('listActions')
            await fn(mockApis, { nodeName: 'composio' })
            expect(mockApis.nodesApi.loadNodeMethod).toHaveBeenCalledWith('composio', 'listActions', {
                currentNode: { inputs: {} }
            })
        })

        it('should reject when nodeName param is missing', async () => {
            const fn = getLoadMethod('listActions')
            await expect(fn(mockApis)).rejects.toThrow('loadMethod "listActions" requires a string "nodeName" parameter.')
        })
    })

    describe('listTables', () => {
        it('should call nodesApi.loadNodeMethod() with nodeName, listTables, and currentNode.inputs', async () => {
            const mockTables = [{ name: 'my-table', label: 'my-table' }]
            ;(mockApis.nodesApi.loadNodeMethod as jest.Mock).mockResolvedValue(mockTables)

            const fn = getLoadMethod('listTables')
            const result = await fn(mockApis, { nodeName: 'awsDynamoDBKVStorage', inputs: { region: 'us-east-1' } })
            expect(mockApis.nodesApi.loadNodeMethod).toHaveBeenCalledWith('awsDynamoDBKVStorage', 'listTables', {
                currentNode: { inputs: { region: 'us-east-1' } }
            })
            expect(result).toEqual(mockTables)
        })

        it('should pass empty inputs when inputs param is omitted', async () => {
            ;(mockApis.nodesApi.loadNodeMethod as jest.Mock).mockResolvedValue([])

            const fn = getLoadMethod('listTables')
            await fn(mockApis, { nodeName: 'awsDynamoDBKVStorage' })
            expect(mockApis.nodesApi.loadNodeMethod).toHaveBeenCalledWith('awsDynamoDBKVStorage', 'listTables', {
                currentNode: { inputs: {} }
            })
        })

        it('should reject when nodeName param is missing', async () => {
            const fn = getLoadMethod('listTables')
            await expect(fn(mockApis)).rejects.toThrow('loadMethod "listTables" requires a string "nodeName" parameter.')
        })
    })

    describe('listCredentials', () => {
        it('should call credentialsApi.getCredentialsByName() with params.name', async () => {
            const mockCredentials = [{ id: '1', name: 'My Key', credentialName: 'openAIApi' }]
            ;(mockApis.credentialsApi.getCredentialsByName as jest.Mock).mockResolvedValue(mockCredentials)

            const result = await loadMethodRegistry['listCredentials'](mockApis, { name: 'openAIApi' })
            expect(mockApis.credentialsApi.getCredentialsByName).toHaveBeenCalledWith('openAIApi')
            expect(result).toEqual(mockCredentials)
        })
    })
})

describe('getLoadMethod', () => {
    it('should return the registry function for a known key', () => {
        const fn = getLoadMethod('listModels')
        expect(fn).toBeDefined()
        expect(typeof fn).toBe('function')
    })

    it('should return the registry function for listTools', () => {
        const fn = getLoadMethod('listTools')
        expect(fn).toBeDefined()
        expect(typeof fn).toBe('function')
    })

    it('should return the registry function for listCredentials', () => {
        const fn = getLoadMethod('listCredentials')
        expect(fn).toBeDefined()
        expect(typeof fn).toBe('function')
    })

    it('should return a generic fallback function for an unregistered key', () => {
        const fn = getLoadMethod('listTopics')
        expect(fn).toBeDefined()
        expect(typeof fn).toBe('function')
    })

    it('generic fallback should call nodesApi.loadNodeMethod with nodeName, the loadMethod name, and currentNode.inputs', async () => {
        const mockTopics = [{ name: 'my-topic', label: 'my-topic' }]
        ;(mockApis.nodesApi.loadNodeMethod as jest.Mock).mockResolvedValue(mockTopics)

        const fn = getLoadMethod('listTopics')
        const result = await fn(mockApis, { nodeName: 'awsSNS', inputs: { region: 'us-east-1' } })

        expect(mockApis.nodesApi.loadNodeMethod).toHaveBeenCalledWith('awsSNS', 'listTopics', {
            currentNode: { inputs: { region: 'us-east-1' } }
        })
        expect(result).toEqual(mockTopics)
    })

    it('generic fallback should reject when nodeName is missing', async () => {
        const fn = getLoadMethod('listTopics')
        await expect(fn(mockApis)).rejects.toThrow('loadMethod "listTopics" requires a string "nodeName" parameter.')
    })
})
