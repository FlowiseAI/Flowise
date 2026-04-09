// [TODO]: Add i18n support for categories
export const toolAgentFlow = (t) => {
    return {
        nodes: [
            {
                id: 'bufferMemory_0',
                data: {
                    id: 'bufferMemory_0',
                    label: t('assistants.cards.customAssistant.agentFlow.bufferMemory.title'),
                    version: 2,
                    name: 'bufferMemory',
                    type: 'BufferMemory',
                    baseClasses: ['BufferMemory', 'BaseChatMemory', 'BaseMemory'],
                    category: 'Memory',
                    description: t('assistants.cards.customAssistant.agentFlow.bufferMemory.description'),
                    inputParams: [
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.bufferMemory.inputs.sessionId.title'),
                            name: 'sessionId',
                            type: 'string',
                            description: `<Trans i18nKey='assistants.cards.customAssistant.agentFlow.bufferMemory.inputs.sessionId.description' components={{
                                    a: <a href="https://docs.flowiseai.com/memory#ui-and-embedded-chat" target="_blank" />
                                }} />`,
                            default: '',
                            additionalParams: true,
                            optional: true,
                            id: 'bufferMemory_0-input-sessionId-string'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.bufferMemory.inputs.memoryKey.title'),
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
                            label: t('assistants.cards.customAssistant.agentFlow.bufferMemory.outputs.bufferMemory.title'),
                            description: t('assistants.cards.customAssistant.agentFlow.bufferMemory.description'),
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
                    label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.title'),
                    version: 8,
                    name: 'chatOpenAI',
                    type: 'ChatOpenAI',
                    baseClasses: ['ChatOpenAI', 'BaseChatModel', 'BaseLanguageModel', 'Runnable'],
                    category: 'Chat Models',
                    description: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.description'),
                    inputParams: [
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.credential.title'),
                            name: 'credential',
                            type: 'credential',
                            credentialNames: ['openAIApi'],
                            id: 'chatOpenAI_0-input-credential-credential'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.modelName.title'),
                            name: 'modelName',
                            type: 'asyncOptions',
                            loadMethod: 'listModels',
                            default: 'gpt-4o-mini',
                            id: 'chatOpenAI_0-input-modelName-asyncOptions'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.temperature.title'),
                            name: 'temperature',
                            type: 'number',
                            step: 0.1,
                            default: 0.9,
                            optional: true,
                            id: 'chatOpenAI_0-input-temperature-number'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.streaming.title'),
                            name: 'streaming',
                            type: 'boolean',
                            default: true,
                            optional: true,
                            additionalParams: true,
                            id: 'chatOpenAI_0-input-streaming-boolean'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.maxTokens.title'),
                            name: 'maxTokens',
                            type: 'number',
                            step: 1,
                            optional: true,
                            additionalParams: true,
                            id: 'chatOpenAI_0-input-maxTokens-number'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.topP.title'),
                            name: 'topP',
                            type: 'number',
                            step: 0.1,
                            optional: true,
                            additionalParams: true,
                            id: 'chatOpenAI_0-input-topP-number'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.frequencyPenalty.title'),
                            name: 'frequencyPenalty',
                            type: 'number',
                            step: 0.1,
                            optional: true,
                            additionalParams: true,
                            id: 'chatOpenAI_0-input-frequencyPenalty-number'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.presencePenalty.title'),
                            name: 'presencePenalty',
                            type: 'number',
                            step: 0.1,
                            optional: true,
                            additionalParams: true,
                            id: 'chatOpenAI_0-input-presencePenalty-number'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.timeout.title'),
                            name: 'timeout',
                            type: 'number',
                            step: 1,
                            optional: true,
                            additionalParams: true,
                            id: 'chatOpenAI_0-input-timeout-number'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.basepath.title'),
                            name: 'basepath',
                            type: 'string',
                            optional: true,
                            additionalParams: true,
                            id: 'chatOpenAI_0-input-basepath-string'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.proxyUrl.title'),
                            name: 'proxyUrl',
                            type: 'string',
                            optional: true,
                            additionalParams: true,
                            id: 'chatOpenAI_0-input-proxyUrl-string'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.stopSequence.title'),
                            name: 'stopSequence',
                            type: 'string',
                            rows: 4,
                            optional: true,
                            description: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.stopSequence.description'),
                            additionalParams: true,
                            id: 'chatOpenAI_0-input-stopSequence-string'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.baseOptions.title'),
                            name: 'baseOptions',
                            type: 'json',
                            optional: true,
                            additionalParams: true,
                            id: 'chatOpenAI_0-input-baseOptions-json'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.allowImageUploads.title'),
                            name: 'allowImageUploads',
                            type: 'boolean',
                            description: `<Trans i18nKey='assistants.cards.customAssistant.agentFlow.chatOpenAI.inputs.allowImageUploads.description' components={{
                                    a: <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank" />
                                }} />`,
                            default: false,
                            optional: true,
                            id: 'chatOpenAI_0-input-allowImageUploads-boolean'
                        }
                    ],
                    inputAnchors: [
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.inputAnchors.cache.title'),
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
                        allowImageUploads: ''
                    },
                    outputAnchors: [
                        {
                            id: 'chatOpenAI_0-output-chatOpenAI-ChatOpenAI|BaseChatModel|BaseLanguageModel|Runnable',
                            name: 'chatOpenAI',
                            label: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.outputs.chatOpenAI.title'),
                            description: t('assistants.cards.customAssistant.agentFlow.chatOpenAI.description'),
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
                    label: t('assistants.cards.customAssistant.agentFlow.toolAgent.title'),
                    version: 2,
                    name: 'toolAgent',
                    type: 'AgentExecutor',
                    baseClasses: ['AgentExecutor', 'BaseChain', 'Runnable'],
                    category: 'Agents',
                    description: t('assistants.cards.customAssistant.agentFlow.toolAgent.description'),
                    inputParams: [
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.toolAgent.inputs.systemMessage.title'),
                            name: 'systemMessage',
                            type: 'string',
                            default: 'You are a helpful AI assistant.',
                            description: t('assistants.cards.customAssistant.agentFlow.toolAgent.inputs.systemMessage.description'),
                            rows: 4,
                            optional: true,
                            additionalParams: true,
                            id: 'toolAgent_0-input-systemMessage-string'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.toolAgent.inputs.maxIterations.title'),
                            name: 'maxIterations',
                            type: 'number',
                            optional: true,
                            additionalParams: true,
                            id: 'toolAgent_0-input-maxIterations-number'
                        }
                    ],
                    inputAnchors: [
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.toolAgent.inputAnchors.tools.title'),
                            name: 'tools',
                            type: 'Tool',
                            list: true,
                            id: 'toolAgent_0-input-tools-Tool'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.toolAgent.inputAnchors.memory.title'),
                            name: 'memory',
                            type: 'BaseChatMemory',
                            id: 'toolAgent_0-input-memory-BaseChatMemory'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.toolAgent.inputAnchors.model.title'),
                            name: 'model',
                            type: 'BaseChatModel',
                            description: t('assistants.cards.customAssistant.agentFlow.toolAgent.inputAnchors.model.description'),
                            id: 'toolAgent_0-input-model-BaseChatModel'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.toolAgent.inputAnchors.chatPromptTemplate.title'),
                            name: 'chatPromptTemplate',
                            type: 'ChatPromptTemplate',
                            description: t(
                                'assistants.cards.customAssistant.agentFlow.toolAgent.inputAnchors.chatPromptTemplate.description'
                            ),
                            optional: true,
                            id: 'toolAgent_0-input-chatPromptTemplate-ChatPromptTemplate'
                        },
                        {
                            label: t('assistants.cards.customAssistant.agentFlow.toolAgent.inputAnchors.inputModeration.title'),
                            description: t('assistants.cards.customAssistant.agentFlow.toolAgent.inputAnchors.inputModeration.description'),
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
                            label: t('assistants.cards.customAssistant.agentFlow.toolAgent.outputs.toolAgent.title'),
                            description: t('assistants.cards.customAssistant.agentFlow.toolAgent.description'),
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
}
