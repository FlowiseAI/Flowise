export const toolAgentFlow = {
    nodes: [
        {
            id: 'bufferMemory_0',
            data: {
                id: 'bufferMemory_0',
                label: 'Buffer Memory',
                version: 2,
                name: 'bufferMemory',
                type: 'BufferMemory',
                baseClasses: ['BufferMemory', 'BaseChatMemory', 'BaseMemory'],
                category: 'Memory',
                description: 'Retrieve chat messages stored in database',
                inputParams: [
                    {
                        label: 'Session Id',
                        name: 'sessionId',
                        type: 'string',
                        description:
                            'If not specified, a random id will be used. Learn <a target="_blank" href="https://docs.flowiseai.com/memory#ui-and-embedded-chat">more</a>',
                        default: '',
                        additionalParams: true,
                        optional: true,
                        id: 'bufferMemory_0-input-sessionId-string'
                    },
                    {
                        label: 'Memory Key',
                        name: 'memoryKey',
                        type: 'string',
                        default: 'chat_history',
                        additionalParams: true,
                        id: 'bufferMemory_0-input-memoryKey-string'
                    }
                ],
                inputAnchors: [],
                inputs: {
                    sessionId: '',
                    memoryKey: 'chat_history'
                },
                outputAnchors: [
                    {
                        id: 'bufferMemory_0-output-bufferMemory-BufferMemory|BaseChatMemory|BaseMemory',
                        name: 'bufferMemory',
                        label: 'BufferMemory',
                        description: 'Retrieve chat messages stored in database',
                        type: 'BufferMemory | BaseChatMemory | BaseMemory'
                    }
                ],
                outputs: {}
            }
        },
        {
            id: 'chatOpenAI_0',
            data: {
                id: 'chatOpenAI_0',
                label: 'ChatOpenAI',
                version: 8,
                name: 'chatOpenAI',
                type: 'ChatOpenAI',
                baseClasses: ['ChatOpenAI', 'BaseChatModel', 'BaseLanguageModel', 'Runnable'],
                category: 'Chat Models',
                description: 'Wrapper around OpenAI large language models that use the Chat endpoint',
                inputParams: [
                    {
                        label: 'Connect Credential',
                        name: 'credential',
                        type: 'credential',
                        credentialNames: ['openAIApi'],
                        id: 'chatOpenAI_0-input-credential-credential'
                    },
                    {
                        label: 'Model Name',
                        name: 'modelName',
                        type: 'asyncOptions',
                        loadMethod: 'listModels',
                        default: 'gpt-4o-mini',
                        id: 'chatOpenAI_0-input-modelName-asyncOptions'
                    },
                    {
                        label: 'Temperature',
                        name: 'temperature',
                        type: 'number',
                        step: 0.1,
                        default: 0.9,
                        optional: true,
                        id: 'chatOpenAI_0-input-temperature-number'
                    },
                    {
                        label: 'Streaming',
                        name: 'streaming',
                        type: 'boolean',
                        default: true,
                        optional: true,
                        additionalParams: true,
                        id: 'chatOpenAI_0-input-streaming-boolean'
                    },
                    {
                        label: 'Max Tokens',
                        name: 'maxTokens',
                        type: 'number',
                        step: 1,
                        optional: true,
                        additionalParams: true,
                        id: 'chatOpenAI_0-input-maxTokens-number'
                    },
                    {
                        label: 'Top Probability',
                        name: 'topP',
                        type: 'number',
                        step: 0.1,
                        optional: true,
                        additionalParams: true,
                        id: 'chatOpenAI_0-input-topP-number'
                    },
                    {
                        label: 'Frequency Penalty',
                        name: 'frequencyPenalty',
                        type: 'number',
                        step: 0.1,
                        optional: true,
                        additionalParams: true,
                        id: 'chatOpenAI_0-input-frequencyPenalty-number'
                    },
                    {
                        label: 'Presence Penalty',
                        name: 'presencePenalty',
                        type: 'number',
                        step: 0.1,
                        optional: true,
                        additionalParams: true,
                        id: 'chatOpenAI_0-input-presencePenalty-number'
                    },
                    {
                        label: 'Timeout',
                        name: 'timeout',
                        type: 'number',
                        step: 1,
                        optional: true,
                        additionalParams: true,
                        id: 'chatOpenAI_0-input-timeout-number'
                    },
                    {
                        label: 'BasePath',
                        name: 'basepath',
                        type: 'string',
                        optional: true,
                        additionalParams: true,
                        id: 'chatOpenAI_0-input-basepath-string'
                    },
                    {
                        label: 'Proxy Url',
                        name: 'proxyUrl',
                        type: 'string',
                        optional: true,
                        additionalParams: true,
                        id: 'chatOpenAI_0-input-proxyUrl-string'
                    },
                    {
                        label: 'Stop Sequence',
                        name: 'stopSequence',
                        type: 'string',
                        rows: 4,
                        optional: true,
                        description: 'List of stop words to use when generating. Use comma to separate multiple stop words.',
                        additionalParams: true,
                        id: 'chatOpenAI_0-input-stopSequence-string'
                    },
                    {
                        label: 'BaseOptions',
                        name: 'baseOptions',
                        type: 'json',
                        optional: true,
                        additionalParams: true,
                        id: 'chatOpenAI_0-input-baseOptions-json'
                    },
                    {
                        label: 'Allow Image Uploads',
                        name: 'allowImageUploads',
                        type: 'boolean',
                        description:
                            'Allow image input. Refer to the <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank">docs</a> for more details.',
                        default: false,
                        optional: true,
                        id: 'chatOpenAI_0-input-allowImageUploads-boolean'
                    },
                    {
                        label: 'Image Resolution',
                        description: 'This parameter controls the resolution in which the model views the image.',
                        name: 'imageResolution',
                        type: 'options',
                        options: [
                            {
                                label: 'Low',
                                name: 'low'
                            },
                            {
                                label: 'High',
                                name: 'high'
                            },
                            {
                                label: 'Auto',
                                name: 'auto'
                            }
                        ],
                        default: 'low',
                        optional: false,
                        additionalParams: true,
                        id: 'chatOpenAI_0-input-imageResolution-options'
                    }
                ],
                inputAnchors: [
                    {
                        label: 'Cache',
                        name: 'cache',
                        type: 'BaseCache',
                        optional: true,
                        id: 'chatOpenAI_0-input-cache-BaseCache'
                    }
                ],
                inputs: {
                    cache: '',
                    modelName: 'gpt-4o-mini',
                    temperature: 0.9,
                    streaming: true,
                    maxTokens: '',
                    topP: '',
                    frequencyPenalty: '',
                    presencePenalty: '',
                    timeout: '',
                    basepath: '',
                    proxyUrl: '',
                    stopSequence: '',
                    baseOptions: '',
                    allowImageUploads: '',
                    imageResolution: 'low'
                },
                outputAnchors: [
                    {
                        id: 'chatOpenAI_0-output-chatOpenAI-ChatOpenAI|BaseChatModel|BaseLanguageModel|Runnable',
                        name: 'chatOpenAI',
                        label: 'ChatOpenAI',
                        description: 'Wrapper around OpenAI large language models that use the Chat endpoint',
                        type: 'ChatOpenAI | BaseChatModel | BaseLanguageModel | Runnable'
                    }
                ],
                outputs: {}
            }
        },
        {
            id: 'toolAgent_0',
            data: {
                id: 'toolAgent_0',
                label: 'Tool Agent',
                version: 2,
                name: 'toolAgent',
                type: 'AgentExecutor',
                baseClasses: ['AgentExecutor', 'BaseChain', 'Runnable'],
                category: 'Agents',
                description: 'Agent that uses Function Calling to pick the tools and args to call',
                inputParams: [
                    {
                        label: 'System Message',
                        name: 'systemMessage',
                        type: 'string',
                        default: 'You are a helpful AI assistant.',
                        description: 'If Chat Prompt Template is provided, this will be ignored',
                        rows: 4,
                        optional: true,
                        additionalParams: true,
                        id: 'toolAgent_0-input-systemMessage-string'
                    },
                    {
                        label: 'Max Iterations',
                        name: 'maxIterations',
                        type: 'number',
                        optional: true,
                        additionalParams: true,
                        id: 'toolAgent_0-input-maxIterations-number'
                    }
                ],
                inputAnchors: [
                    {
                        label: 'Tools',
                        name: 'tools',
                        type: 'Tool',
                        list: true,
                        id: 'toolAgent_0-input-tools-Tool'
                    },
                    {
                        label: 'Memory',
                        name: 'memory',
                        type: 'BaseChatMemory',
                        id: 'toolAgent_0-input-memory-BaseChatMemory'
                    },
                    {
                        label: 'Tool Calling Chat Model',
                        name: 'model',
                        type: 'BaseChatModel',
                        description:
                            'Only compatible with models that are capable of function calling: ChatOpenAI, ChatMistral, ChatAnthropic, ChatGoogleGenerativeAI, ChatVertexAI, GroqChat',
                        id: 'toolAgent_0-input-model-BaseChatModel'
                    },
                    {
                        label: 'Chat Prompt Template',
                        name: 'chatPromptTemplate',
                        type: 'ChatPromptTemplate',
                        description: 'Override existing prompt with Chat Prompt Template. Human Message must includes {input} variable',
                        optional: true,
                        id: 'toolAgent_0-input-chatPromptTemplate-ChatPromptTemplate'
                    },
                    {
                        label: 'Input Moderation',
                        description: 'Detect text that could generate harmful output and prevent it from being sent to the language model',
                        name: 'inputModeration',
                        type: 'Moderation',
                        optional: true,
                        list: true,
                        id: 'toolAgent_0-input-inputModeration-Moderation'
                    }
                ],
                inputs: {
                    tools: [],
                    memory: '{{bufferMemory_0.data.instance}}',
                    model: '{{chatOpenAI_0.data.instance}}',
                    chatPromptTemplate: '',
                    systemMessage: 'You are helpful assistant',
                    inputModeration: '',
                    maxIterations: ''
                },
                outputAnchors: [
                    {
                        id: 'toolAgent_0-output-toolAgent-AgentExecutor|BaseChain|Runnable',
                        name: 'toolAgent',
                        label: 'AgentExecutor',
                        description: 'Agent that uses Function Calling to pick the tools and args to call',
                        type: 'AgentExecutor | BaseChain | Runnable'
                    }
                ],
                outputs: {}
            }
        }
    ],
    edges: [
        {
            source: 'bufferMemory_0',
            sourceHandle: 'bufferMemory_0-output-bufferMemory-BufferMemory|BaseChatMemory|BaseMemory',
            target: 'toolAgent_0',
            targetHandle: 'toolAgent_0-input-memory-BaseChatMemory',
            type: 'buttonedge',
            id: 'bufferMemory_0-bufferMemory_0-output-bufferMemory-BufferMemory|BaseChatMemory|BaseMemory-toolAgent_0-toolAgent_0-input-memory-BaseChatMemory'
        },
        {
            source: 'chatOpenAI_0',
            sourceHandle: 'chatOpenAI_0-output-chatOpenAI-ChatOpenAI|BaseChatModel|BaseLanguageModel|Runnable',
            target: 'toolAgent_0',
            targetHandle: 'toolAgent_0-input-model-BaseChatModel',
            type: 'buttonedge',
            id: 'chatOpenAI_0-chatOpenAI_0-output-chatOpenAI-ChatOpenAI|BaseChatModel|BaseLanguageModel|Runnable-toolAgent_0-toolAgent_0-input-model-BaseChatModel'
        }
    ]
}
