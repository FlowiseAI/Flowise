import { useState, useCallback, useEffect } from 'react'
import { AgentflowProvider, Agentflow, useAgentFlow } from '@flowise/agentflow'
import { FullPageChat } from 'flowise-embed-react'
import '@flowise/agentflow/flowise.css'
import './App.css'

const BACKEND_URL = 'http://localhost:3001'
const FLOWISE_URL = 'http://localhost:3000'

// Mock tenants data
const MOCK_TENANTS = [
    { id: 'tenant-1', name: 'Acme Corporation', color: '#6366f1' },
    { id: 'tenant-2', name: 'TechStart Inc.', color: '#10b981' },
    { id: 'tenant-3', name: 'Global Dynamics', color: '#f59e0b' },
    { id: 'tenant-4', name: 'Innovate Labs', color: '#ef4444' }
]

// Sample initial flow data
// In production, this would be fetched from your AppHub/storage
const initialFlow = {
    id: 'ef299959-1e43-42bd-a74e-058b2a97de01',
    name: 'Demo Agent Flow',
    flowData: {
        nodes: [
            {
                id: 'startAgentflow_0',
                type: 'agentFlow',
                position: { x: -42, y: 50.5 },
                data: {
                    id: 'startAgentflow_0',
                    label: 'Start',
                    version: 1.1,
                    name: 'startAgentflow',
                    type: 'Start',
                    color: '#7EE787',
                    hideInput: true,
                    baseClasses: ['Start'],
                    category: 'Agent Flows',
                    description: 'Starting point of the agentflow',
                    inputParams: [
                        {
                            label: 'Input Type',
                            name: 'startInputType',
                            type: 'options',
                            options: [
                                { label: 'Chat Input', name: 'chatInput', description: 'Start the conversation with chat input' },
                                { label: 'Form Input', name: 'formInput', description: 'Start the workflow with form inputs' }
                            ],
                            default: 'chatInput',
                            id: 'startAgentflow_0-input-startInputType-options',
                            display: true
                        },
                        {
                            label: 'Form Title',
                            name: 'formTitle',
                            type: 'string',
                            placeholder: 'Please Fill Out The Form',
                            show: { startInputType: 'formInput' },
                            id: 'startAgentflow_0-input-formTitle-string',
                            display: false
                        },
                        {
                            label: 'Form Description',
                            name: 'formDescription',
                            type: 'string',
                            placeholder: 'Complete all fields below to continue',
                            show: { startInputType: 'formInput' },
                            id: 'startAgentflow_0-input-formDescription-string',
                            display: false
                        },
                        {
                            label: 'Form Input Types',
                            name: 'formInputTypes',
                            description: 'Specify the type of form input',
                            type: 'array',
                            show: { startInputType: 'formInput' },
                            array: [
                                {
                                    label: 'Type',
                                    name: 'type',
                                    type: 'options',
                                    options: [
                                        { label: 'String', name: 'string' },
                                        { label: 'Number', name: 'number' },
                                        { label: 'Boolean', name: 'boolean' },
                                        { label: 'Options', name: 'options' }
                                    ],
                                    default: 'string'
                                },
                                { label: 'Label', name: 'label', type: 'string', placeholder: 'Label for the input' },
                                {
                                    label: 'Variable Name',
                                    name: 'name',
                                    type: 'string',
                                    placeholder: 'Variable name for the input (must be camel case)',
                                    description: 'Variable name must be camel case. For example: firstName, lastName, etc.'
                                },
                                {
                                    label: 'Add Options',
                                    name: 'addOptions',
                                    type: 'array',
                                    show: { 'formInputTypes[$index].type': 'options' },
                                    array: [{ label: 'Option', name: 'option', type: 'string' }]
                                }
                            ],
                            id: 'startAgentflow_0-input-formInputTypes-array',
                            display: false
                        },
                        {
                            label: 'Ephemeral Memory',
                            name: 'startEphemeralMemory',
                            type: 'boolean',
                            description: 'Start fresh for every execution without past chat history',
                            optional: true,
                            id: 'startAgentflow_0-input-startEphemeralMemory-boolean',
                            display: true
                        },
                        {
                            label: 'Flow State',
                            name: 'startState',
                            description: 'Runtime state during the execution of the workflow',
                            type: 'array',
                            optional: true,
                            array: [
                                { label: 'Key', name: 'key', type: 'string', placeholder: 'Foo' },
                                { label: 'Value', name: 'value', type: 'string', placeholder: 'Bar', optional: true }
                            ],
                            id: 'startAgentflow_0-input-startState-array',
                            display: true
                        },
                        {
                            label: 'Persist State',
                            name: 'startPersistState',
                            type: 'boolean',
                            description: 'Persist the state in the same session',
                            optional: true,
                            id: 'startAgentflow_0-input-startPersistState-boolean',
                            display: true
                        }
                    ],
                    inputAnchors: [],
                    inputs: {
                        startInputType: 'chatInput',
                        formTitle: '',
                        formDescription: '',
                        formInputTypes: '',
                        startEphemeralMemory: '',
                        startState: '',
                        startPersistState: ''
                    },
                    outputAnchors: [{ id: 'startAgentflow_0-output-startAgentflow', label: 'Start', name: 'startAgentflow' }],
                    outputs: {},
                    selected: false
                },
                width: 103,
                height: 66,
                selected: false,
                positionAbsolute: { x: -42, y: 50.5 },
                dragging: false
            },
            {
                id: 'agentAgentflow_0',
                position: { x: 119.125, y: 56.25 },
                data: {
                    loadMethods: {},
                    label: 'Agent 0',
                    name: 'agentAgentflow',
                    version: 3.2,
                    type: 'Agent',
                    category: 'Agent Flows',
                    description: 'Dynamically choose and utilize tools during runtime, enabling multi-step reasoning',
                    color: '#4DD0E1',
                    baseClasses: ['Agent'],
                    inputs: {
                        agentModel: 'chatOpenAI',
                        agentMessages: [
                            {
                                role: 'system',
                                content:
                                    '<p>Today date is <span class="variable" data-type="mention" data-id="current_date_time" data-label="current_date_time">{{ current_date_time }}</span> </p>'
                            }
                        ],
                        agentToolsBuiltInOpenAI: '',
                        agentToolsBuiltInGemini: '',
                        agentToolsBuiltInAnthropic: '',
                        agentTools: [
                            {
                                agentSelectedTool: 'googleDriveTool',
                                agentSelectedToolRequiresHumanInput: '',
                                agentSelectedToolConfig: {
                                    driveType: 'folder',
                                    folderActions: '["listFolderContents"]',
                                    agentSelectedTool: 'googleDriveTool',
                                    FLOWISE_CREDENTIAL_ID: 'f5f9103e-0a5a-46d5-8758-46bd6911a601',
                                    folderId: '1hjZ1inwYYtqnHwaxA9nwC5tSa73pxOXi'
                                }
                            }
                        ],
                        agentKnowledgeDocumentStores: '',
                        agentKnowledgeVSEmbeddings: '',
                        agentEnableMemory: true,
                        agentMemoryType: 'allMessages',
                        agentMemoryWindowSize: '20',
                        agentMemoryMaxTokenLimit: '2000',
                        agentUserMessage: '',
                        agentReturnResponseAs: 'userMessage',
                        agentStructuredOutput: '',
                        agentUpdateState: '',
                        agentModelConfig: {
                            credential: '',
                            modelName: 'gpt-4o-mini',
                            temperature: 0.9,
                            streaming: true,
                            maxTokens: '',
                            topP: '',
                            frequencyPenalty: '',
                            presencePenalty: '',
                            timeout: '',
                            strictToolCalling: true,
                            stopSequence: '',
                            basepath: '',
                            proxyUrl: '',
                            baseOptions: '',
                            allowImageUploads: '',
                            reasoning: '',
                            agentModel: 'chatOpenAI',
                            FLOWISE_CREDENTIAL_ID: '89d80d01-1f2e-48b5-b023-ee2f890b12ad'
                        }
                    },
                    filePath:
                        'C:\\Users\\Henry\\Codes\\Flowise\\packages\\server\\node_modules\\flowise-components\\dist\\nodes\\agentflow\\Agent\\Agent.js',
                    inputAnchors: [],
                    inputParams: [
                        {
                            label: 'Model',
                            name: 'agentModel',
                            type: 'asyncOptions',
                            loadMethod: 'listModels',
                            loadConfig: true,
                            id: 'agentAgentflow_0-input-agentModel-asyncOptions',
                            display: true
                        },
                        {
                            label: 'Messages',
                            name: 'agentMessages',
                            type: 'array',
                            optional: true,
                            acceptVariable: true,
                            array: [
                                {
                                    label: 'Role',
                                    name: 'role',
                                    type: 'options',
                                    options: [
                                        { label: 'System', name: 'system' },
                                        { label: 'Assistant', name: 'assistant' },
                                        { label: 'Developer', name: 'developer' },
                                        { label: 'User', name: 'user' }
                                    ]
                                },
                                {
                                    label: 'Content',
                                    name: 'content',
                                    type: 'string',
                                    acceptVariable: true,
                                    generateInstruction: true,
                                    rows: 4
                                }
                            ],
                            id: 'agentAgentflow_0-input-agentMessages-array',
                            display: true
                        },
                        {
                            label: 'OpenAI Built-in Tools',
                            name: 'agentToolsBuiltInOpenAI',
                            type: 'multiOptions',
                            optional: true,
                            options: [
                                {
                                    label: 'Web Search',
                                    name: 'web_search_preview',
                                    description: 'Search the web for the latest information'
                                },
                                {
                                    label: 'Code Interpreter',
                                    name: 'code_interpreter',
                                    description: 'Write and run Python code in a sandboxed environment'
                                },
                                {
                                    label: 'Image Generation',
                                    name: 'image_generation',
                                    description: 'Generate images based on a text prompt'
                                }
                            ],
                            show: { agentModel: 'chatOpenAI' },
                            id: 'agentAgentflow_0-input-agentToolsBuiltInOpenAI-multiOptions',
                            display: false
                        },
                        {
                            label: 'Gemini Built-in Tools',
                            name: 'agentToolsBuiltInGemini',
                            type: 'multiOptions',
                            optional: true,
                            options: [
                                { label: 'URL Context', name: 'urlContext', description: 'Extract content from given URLs' },
                                { label: 'Google Search', name: 'googleSearch', description: 'Search real-time web content' },
                                {
                                    label: 'Code Execution',
                                    name: 'codeExecution',
                                    description: 'Write and run Python code in a sandboxed environment'
                                }
                            ],
                            show: { agentModel: 'chatGoogleGenerativeAI' },
                            id: 'agentAgentflow_0-input-agentToolsBuiltInGemini-multiOptions',
                            display: false
                        },
                        {
                            label: 'Anthropic Built-in Tools',
                            name: 'agentToolsBuiltInAnthropic',
                            type: 'multiOptions',
                            optional: true,
                            options: [
                                {
                                    label: 'Web Search',
                                    name: 'web_search_20250305',
                                    description: 'Search the web for the latest information'
                                },
                                {
                                    label: 'Web Fetch',
                                    name: 'web_fetch_20250910',
                                    description: 'Retrieve full content from specified web pages'
                                }
                            ],
                            show: { agentModel: 'chatAnthropic' },
                            id: 'agentAgentflow_0-input-agentToolsBuiltInAnthropic-multiOptions',
                            display: false
                        },
                        {
                            label: 'Tools',
                            name: 'agentTools',
                            type: 'array',
                            optional: true,
                            array: [
                                {
                                    label: 'Tool',
                                    name: 'agentSelectedTool',
                                    type: 'asyncOptions',
                                    loadMethod: 'listTools',
                                    loadConfig: true
                                },
                                {
                                    label: 'Require Human Input',
                                    name: 'agentSelectedToolRequiresHumanInput',
                                    type: 'boolean',
                                    optional: true
                                }
                            ],
                            id: 'agentAgentflow_0-input-agentTools-array',
                            display: true
                        },
                        {
                            label: 'Knowledge (Document Stores)',
                            name: 'agentKnowledgeDocumentStores',
                            type: 'array',
                            description:
                                'Give your agent context about different document sources. Document stores must be upserted in advance.',
                            array: [
                                { label: 'Document Store', name: 'documentStore', type: 'asyncOptions', loadMethod: 'listStores' },
                                {
                                    label: 'Describe Knowledge',
                                    name: 'docStoreDescription',
                                    type: 'string',
                                    generateDocStoreDescription: true,
                                    placeholder:
                                        'Describe what the knowledge base is about, this is useful for the AI to know when and how to search for correct information',
                                    rows: 4
                                },
                                { label: 'Return Source Documents', name: 'returnSourceDocuments', type: 'boolean', optional: true }
                            ],
                            optional: true,
                            id: 'agentAgentflow_0-input-agentKnowledgeDocumentStores-array',
                            display: true
                        },
                        {
                            label: 'Knowledge (Vector Embeddings)',
                            name: 'agentKnowledgeVSEmbeddings',
                            type: 'array',
                            description:
                                'Give your agent context about different document sources from existing vector stores and embeddings',
                            array: [
                                {
                                    label: 'Vector Store',
                                    name: 'vectorStore',
                                    type: 'asyncOptions',
                                    loadMethod: 'listVectorStores',
                                    loadConfig: true
                                },
                                {
                                    label: 'Embedding Model',
                                    name: 'embeddingModel',
                                    type: 'asyncOptions',
                                    loadMethod: 'listEmbeddings',
                                    loadConfig: true
                                },
                                {
                                    label: 'Knowledge Name',
                                    name: 'knowledgeName',
                                    type: 'string',
                                    placeholder:
                                        'A short name for the knowledge base, this is useful for the AI to know when and how to search for correct information'
                                },
                                {
                                    label: 'Describe Knowledge',
                                    name: 'knowledgeDescription',
                                    type: 'string',
                                    placeholder:
                                        'Describe what the knowledge base is about, this is useful for the AI to know when and how to search for correct information',
                                    rows: 4
                                },
                                { label: 'Return Source Documents', name: 'returnSourceDocuments', type: 'boolean', optional: true }
                            ],
                            optional: true,
                            id: 'agentAgentflow_0-input-agentKnowledgeVSEmbeddings-array',
                            display: true
                        },
                        {
                            label: 'Enable Memory',
                            name: 'agentEnableMemory',
                            type: 'boolean',
                            description: 'Enable memory for the conversation thread',
                            default: true,
                            optional: true,
                            id: 'agentAgentflow_0-input-agentEnableMemory-boolean',
                            display: true
                        },
                        {
                            label: 'Memory Type',
                            name: 'agentMemoryType',
                            type: 'options',
                            options: [
                                { label: 'All Messages', name: 'allMessages', description: 'Retrieve all messages from the conversation' },
                                {
                                    label: 'Window Size',
                                    name: 'windowSize',
                                    description: 'Uses a fixed window size to surface the last N messages'
                                },
                                {
                                    label: 'Conversation Summary',
                                    name: 'conversationSummary',
                                    description: 'Summarizes the whole conversation'
                                },
                                {
                                    label: 'Conversation Summary Buffer',
                                    name: 'conversationSummaryBuffer',
                                    description: 'Summarize conversations once token limit is reached. Default to 2000'
                                }
                            ],
                            optional: true,
                            default: 'allMessages',
                            show: { agentEnableMemory: true },
                            id: 'agentAgentflow_0-input-agentMemoryType-options',
                            display: true
                        },
                        {
                            label: 'Window Size',
                            name: 'agentMemoryWindowSize',
                            type: 'number',
                            default: '20',
                            description: 'Uses a fixed window size to surface the last N messages',
                            show: { agentMemoryType: 'windowSize' },
                            id: 'agentAgentflow_0-input-agentMemoryWindowSize-number',
                            display: false
                        },
                        {
                            label: 'Max Token Limit',
                            name: 'agentMemoryMaxTokenLimit',
                            type: 'number',
                            default: '2000',
                            description: 'Summarize conversations once token limit is reached. Default to 2000',
                            show: { agentMemoryType: 'conversationSummaryBuffer' },
                            id: 'agentAgentflow_0-input-agentMemoryMaxTokenLimit-number',
                            display: false
                        },
                        {
                            label: 'Input Message',
                            name: 'agentUserMessage',
                            type: 'string',
                            description: 'Add an input message as user message at the end of the conversation',
                            rows: 4,
                            optional: true,
                            acceptVariable: true,
                            show: { agentEnableMemory: true },
                            id: 'agentAgentflow_0-input-agentUserMessage-string',
                            display: true
                        },
                        {
                            label: 'Return Response As',
                            name: 'agentReturnResponseAs',
                            type: 'options',
                            options: [
                                { label: 'User Message', name: 'userMessage' },
                                { label: 'Assistant Message', name: 'assistantMessage' }
                            ],
                            default: 'userMessage',
                            id: 'agentAgentflow_0-input-agentReturnResponseAs-options',
                            display: true
                        },
                        {
                            label: 'JSON Structured Output',
                            name: 'agentStructuredOutput',
                            description: 'Instruct the Agent to give output in a JSON structured schema',
                            type: 'array',
                            optional: true,
                            acceptVariable: true,
                            array: [
                                { label: 'Key', name: 'key', type: 'string' },
                                {
                                    label: 'Type',
                                    name: 'type',
                                    type: 'options',
                                    options: [
                                        { label: 'String', name: 'string' },
                                        { label: 'String Array', name: 'stringArray' },
                                        { label: 'Number', name: 'number' },
                                        { label: 'Boolean', name: 'boolean' },
                                        { label: 'Enum', name: 'enum' },
                                        { label: 'JSON Array', name: 'jsonArray' }
                                    ]
                                },
                                {
                                    label: 'Enum Values',
                                    name: 'enumValues',
                                    type: 'string',
                                    placeholder: 'value1, value2, value3',
                                    description: 'Enum values. Separated by comma',
                                    optional: true,
                                    show: { 'agentStructuredOutput[$index].type': 'enum' }
                                },
                                {
                                    label: 'JSON Schema',
                                    name: 'jsonSchema',
                                    type: 'code',
                                    placeholder:
                                        '{\n    "answer": {\n        "type": "string",\n        "description": "Value of the answer"\n    },\n    "reason": {\n        "type": "string",\n        "description": "Reason for the answer"\n    },\n    "optional": {\n        "type": "boolean"\n    },\n    "count": {\n        "type": "number"\n    },\n    "children": {\n        "type": "array",\n        "items": {\n            "type": "object",\n            "properties": {\n                "value": {\n                    "type": "string",\n                    "description": "Value of the children\'s answer"\n                }\n            }\n        }\n    }\n}',
                                    description: 'JSON schema for the structured output',
                                    optional: true,
                                    hideCodeExecute: true,
                                    show: { 'agentStructuredOutput[$index].type': 'jsonArray' }
                                },
                                { label: 'Description', name: 'description', type: 'string', placeholder: 'Description of the key' }
                            ],
                            id: 'agentAgentflow_0-input-agentStructuredOutput-array',
                            display: true
                        },
                        {
                            label: 'Update Flow State',
                            name: 'agentUpdateState',
                            description: 'Update runtime state during the execution of the workflow',
                            type: 'array',
                            optional: true,
                            acceptVariable: true,
                            array: [
                                { label: 'Key', name: 'key', type: 'asyncOptions', loadMethod: 'listRuntimeStateKeys' },
                                { label: 'Value', name: 'value', type: 'string', acceptVariable: true, acceptNodeOutputAsVariable: true }
                            ],
                            id: 'agentAgentflow_0-input-agentUpdateState-array',
                            display: true
                        }
                    ],
                    outputs: {},
                    outputAnchors: [{ id: 'agentAgentflow_0-output-agentAgentflow', label: 'Agent', name: 'agentAgentflow' }],
                    id: 'agentAgentflow_0',
                    selected: false
                },
                type: 'agentFlow',
                width: 175,
                height: 100,
                selected: true,
                dragging: false,
                positionAbsolute: { x: 119.125, y: 56.25 }
            }
        ],
        edges: [
            {
                source: 'startAgentflow_0',
                sourceHandle: 'startAgentflow_0-output-startAgentflow',
                target: 'agentAgentflow_0',
                targetHandle: 'agentAgentflow_0',
                data: { sourceColor: '#7EE787', targetColor: '#4DD0E1', isHumanInput: false },
                type: 'agentFlow',
                id: 'startAgentflow_0-startAgentflow_0-output-startAgentflow-agentAgentflow_0-agentAgentflow_0'
            }
        ],
        viewport: { x: 707.875, y: 230.75, zoom: 2 }
    },
    type: 'AGENTFLOW',
    chatbotConfig: {
        fullFileUpload: true
    }
}

// Chat Panel Component with Tenant Selector
function ChatPanel({ chatflowId, apiHost }) {
    const [selectedTenant, setSelectedTenant] = useState(MOCK_TENANTS[0])
    const [chatKey, setChatKey] = useState(0) // Key to force re-render of FullPageChat

    const handleTenantChange = (e) => {
        const tenant = MOCK_TENANTS.find((t) => t.id === e.target.value)
        setSelectedTenant(tenant)
        // Force re-render of FullPageChat to clear chat history
        setChatKey((prev) => prev + 1)
    }

    return (
        <div className='chat-panel'>
            {/* Tenant Selector */}
            <div className='tenant-selector'>
                <label htmlFor='tenant-select'>Select Tenant</label>
                <div className='select-wrapper'>
                    <div className='tenant-indicator' style={{ backgroundColor: selectedTenant.color }} />
                    <select id='tenant-select' value={selectedTenant.id} onChange={handleTenantChange}>
                        {MOCK_TENANTS.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>
                                {tenant.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* FullPageChat Container */}
            <div className='chat-embed-container'>
                <FullPageChat
                    key={chatKey}
                    chatflowid={chatflowId}
                    apiHost={apiHost}
                    observersConfig={{
                        observeUserInput: (userInput) => {
                            console.log('User input:', userInput)
                        },
                        observeMessages: (messages) => {
                            console.log('Messages updated:', messages)
                        },
                        observeLoading: (loading) => {
                            console.log('Loading state:', loading)
                        }
                    }}
                    chatflowConfig={{}}
                    theme={{
                        chatWindow: {
                            showTitle: true,
                            title: `${selectedTenant.name} Agent`,
                            titleAvatarSrc: '',
                            showAgentMessages: false,
                            welcomeMessage: `Welcome to ${selectedTenant.name}! How can I help you today?`,
                            backgroundColor: '#ffffff',
                            height: '840',
                            width: '100%',
                            fontSize: 14,
                            botMessage: {
                                backgroundColor: '#f7f8ff',
                                textColor: '#303235',
                                showAvatar: true,
                                avatarSrc: ''
                            },
                            userMessage: {
                                backgroundColor: selectedTenant.color,
                                textColor: '#ffffff',
                                showAvatar: true,
                                avatarSrc: ''
                            },
                            textInput: {
                                placeholder: 'Type your question...',
                                backgroundColor: '#ffffff',
                                textColor: '#303235',
                                sendButtonColor: selectedTenant.color
                            }
                        }
                    }}
                />
            </div>
        </div>
    )
}

function ControlPanel({ onSave }) {
    const agentFlow = useAgentFlow()

    const handleSave = useCallback(() => {
        const flow = agentFlow.getFlow()
        onSave(flow)
        console.log('Flow saved:', flow)
    }, [agentFlow, onSave])

    const handleValidate = useCallback(() => {
        const result = agentFlow.validate()
        if (result.valid) {
            alert('Flow is valid!')
        } else {
            alert('Errors:\n' + result.errors.map((e) => e.message).join('\n'))
        }
    }, [agentFlow])

    const handdlePublish = useCallback(() => {}, [agentFlow])

    const handleExport = useCallback(() => {
        const json = agentFlow.toJSON()
        navigator.clipboard.writeText(json)
        alert('Flow JSON copied to clipboard!')
    }, [agentFlow])

    const handleFitView = useCallback(() => {
        agentFlow.fitView()
    }, [agentFlow])

    return (
        <div className='control-panel'>
            <h2>Agentflow Demo</h2>
            <p className='subtitle'>Embeddable Flow Editor</p>

            <div className='button-group'>
                <button onClick={handleSave} className='btn btn-primary'>
                    Save Flow
                </button>
                <button onClick={handleValidate} className='btn btn-secondary'>
                    Validate
                </button>
                <button onClick={handleExport} className='btn btn-secondary'>
                    Copy JSON
                </button>
                <button onClick={handleFitView} className='btn btn-secondary'>
                    Fit View
                </button>
            </div>
        </div>
    )
}

function App() {
    const [token, setToken] = useState(null)
    const [savedFlow, setSavedFlow] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        // Fetch JWT token from backend
        const fetchToken = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/generate-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })

                if (!response.ok) {
                    throw new Error('Failed to generate token')
                }

                const data = await response.json()
                setToken(data.token)
                setLoading(false)
            } catch (err) {
                setError(err.message)
                setLoading(false)
            }
        }

        fetchToken()
    }, [])

    const handleSave = useCallback((flow) => {
        setSavedFlow(flow)
        console.log('Flow saved to state:', flow)
    }, [])

    if (loading) {
        return (
            <div className='loading-container'>
                <div className='loading-spinner'></div>
                <p>Loading demo...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className='error-container'>
                <h2>Error</h2>
                <p>{error}</p>
                <p>Make sure the backend server is running on {BACKEND_URL}</p>
            </div>
        )
    }

    return (
        <AgentflowProvider>
            <div className='app-container'>
                {/* Sidebar */}
                <aside className='sidebar'>
                    <ControlPanel onSave={handleSave} />
                    {savedFlow && (
                        <div className='saved-flow-preview'>
                            <h3>Saved Flow</h3>
                            <pre>{JSON.stringify(savedFlow, null, 2)}</pre>
                        </div>
                    )}
                </aside>

                {/* Canvas */}
                <main className='canvas-container'>
                    <Agentflow
                        instanceUrl={FLOWISE_URL}
                        token={token}
                        flow={initialFlow}
                        components={[
                            'startAgentflow',
                            'agentAgentflow',
                            'llmAgentflow',
                            'toolAgentflow',
                            'conditionAgentflow',
                            'conditionAgentAgentflow',
                            'humanInputAgentflow',
                            'iterationAgentflow',
                            'stickyNoteAgentflow',
                            'directReplyAgentflow',
                            'httpAgentflow',
                            'loopAgentflow',
                            'retrieverAgentflow'
                        ]}
                    />
                </main>

                {/* Chat Panel */}
                <aside className='chat-sidebar'>
                    <ChatPanel chatflowId={initialFlow.id} apiHost={FLOWISE_URL} />
                </aside>
            </div>
        </AgentflowProvider>
    )
}

export default App
