import { INodeData } from '../../../src/Interface'
import { ChatOpenAI } from '../ChatOpenAI/FlowiseChatOpenAI'

// Import the target node class for testing
const { nodeClass } = require('./ChatLitellm')

// Mock external utility functions
jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['BaseChatModel', 'ChatLitellm']),
    getCredentialData: jest.fn().mockResolvedValue({}),
    getCredentialParam: jest.fn().mockReturnValue('sk-test-api-key')
}))

// Mock FlowiseChatOpenAI class to prevent actual API calls and verify passed parameters
jest.mock('../ChatOpenAI/FlowiseChatOpenAI', () => {
    return {
        ChatOpenAI: jest.fn().mockImplementation((id, obj) => {
            return {
                id,
                obj, // Expose the injected parameters for testing
                setMultiModalOption: jest.fn()
            }
        })
    }
})

describe('ChatLitellm_ChatModels', () => {
    let node: any

    beforeEach(() => {
        node = new nodeClass()
        jest.clearAllMocks()
    })

    it('should initialize with correct properties and inputs', () => {
        expect(node.label).toBe('LiteLLM')
        expect(node.name).toBe('chatLitellm')
        expect(node.type).toBe('ChatLitellm')
        
        // Verify that the newly added 'user' field exists in the inputs array
        const userInput = node.inputs.find((input: any) => input.name === 'user')
        expect(userInput).toBeDefined()
        expect(userInput.type).toBe('string')
        expect(userInput.additionalParams).toBe(true)
    })

    it('should initialize the model with basic required parameters', async () => {
        const nodeData: INodeData = {
            id: 'test-node-id',
            inputs: {
                modelName: 'vertex-gemini-2.5-flash',
                temperature: '0.7'
            }
        } as any

        const model = await node.init(nodeData, '', {})

        expect(ChatOpenAI).toHaveBeenCalledTimes(1)
        expect(model.id).toBe('test-node-id')
        
        // Check basic parameter mapping
        expect(model.obj.modelName).toBe('vertex-gemini-2.5-flash')
        expect(model.obj.temperature).toBe(0.7)
        expect(model.obj.streaming).toBe(true) // Default fallback
        expect(model.obj.openAIApiKey).toBe('sk-test-api-key')
    })

    it('should properly map advanced parameters including the new "user" parameter', async () => {
        const nodeData: INodeData = {
            id: 'test-node-id',
            inputs: {
                modelName: 'vertex-gemini-2.5-flash',
                temperature: '0.5',
                streaming: false,
                maxTokens: '1024',
                topP: '0.9',
                timeout: '5000',
                user: 'test01', // Added User ID
                basePath: 'http://localhost:4000/v1',
                allowImageUploads: true
            }
        } as any

        const model = await node.init(nodeData, '', {})

        expect(ChatOpenAI).toHaveBeenCalledTimes(1)
        
        // Check advanced parameter and user data mapping
        expect(model.obj.user).toBe('test01')
        expect(model.obj.maxTokens).toBe(1024)
        expect(model.obj.topP).toBe(0.9)
        expect(model.obj.timeout).toBe(5000)
        expect(model.obj.streaming).toBe(false)
        
        // Check Base URL configuration
        expect(model.obj.configuration?.baseURL).toBe('http://localhost:4000/v1')
        
        // Check multimodal option call
        expect(model.setMultiModalOption).toHaveBeenCalledWith({
            image: {
                allowImageUploads: true
            }
        })
    })
})
