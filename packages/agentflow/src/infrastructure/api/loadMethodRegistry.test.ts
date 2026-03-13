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
    }
}

beforeEach(() => {
    jest.clearAllMocks()
})

describe('loadMethodRegistry', () => {
    describe('listModels', () => {
        it('should call chatModelsApi.getChatModels()', async () => {
            const mockModels = [{ name: 'gpt-4', label: 'GPT-4' }]
            ;(mockApis.chatModelsApi.getChatModels as jest.Mock).mockResolvedValue(mockModels)

            const result = await loadMethodRegistry['listModels'](mockApis)
            expect(mockApis.chatModelsApi.getChatModels).toHaveBeenCalled()
            expect(result).toEqual(mockModels)
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

    it('should return undefined for an unknown key', () => {
        const fn = getLoadMethod('unknownMethod')
        expect(fn).toBeUndefined()
    })
})
