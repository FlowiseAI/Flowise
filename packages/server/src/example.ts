export const workflow1 = {
    nodes: [
        {
            width: 200,
            height: 66,
            id: 'promptTemplate_0',
            position: {
                x: 295.0571878493141,
                y: 108.66221078850214
            },
            type: 'customNode',
            data: {
                label: 'Prompt Template',
                name: 'promptTemplate',
                type: 'PromptTemplate',
                inputAnchors: [],
                outputAnchors: [
                    {
                        id: 'promptTemplate_0-output-0'
                    }
                ],
                selected: false,
                inputs: {
                    template: 'What is a good name for a company that makes {product}?',
                    inputVariables: '["product"]'
                }
            },
            selected: false,
            positionAbsolute: {
                x: 295.0571878493141,
                y: 108.66221078850214
            },
            dragging: false
        },
        {
            width: 200,
            height: 66,
            id: 'openAI_0',
            position: {
                x: 774,
                y: 97.75
            },
            type: 'customNode',
            data: {
                label: 'OpenAI',
                name: 'openAI',
                type: 'OpenAI',
                inputAnchors: [],
                outputAnchors: [
                    {
                        id: 'openAI_0-output-0'
                    }
                ],
                selected: false,
                inputs: {
                    modelName: 'text-davinci-003',
                    temperature: '0.7',
                    openAIApiKey: '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'
                },
                calls: {
                    prompt: 'Hi, how are you?'
                }
            },
            selected: false,
            positionAbsolute: {
                x: 774,
                y: 97.75
            },
            dragging: false
        },
        {
            width: 200,
            height: 66,
            id: 'llmChain_0',
            position: {
                x: 1034.233162523021,
                y: 97.59868104260748
            },
            type: 'customNode',
            data: {
                label: 'LLM Chain',
                name: 'llmChain',
                type: 'LLMChain',
                inputAnchors: [
                    {
                        id: 'llmChain_0-input-0'
                    }
                ],
                outputAnchors: [
                    {
                        id: 'llmChain_0-output-0'
                    }
                ],
                selected: false,
                inputs: {
                    llm: '{{openAI_0.data.instance}}',
                    prompt: '{{promptTemplate_0.data.instance}}'
                },
                calls: {
                    variable: '{"product":"colorful socks"}'
                }
            },
            selected: false,
            positionAbsolute: {
                x: 1034.233162523021,
                y: 97.59868104260748
            },
            dragging: false
        }
    ],
    edges: [
        {
            source: 'nodeJS_0',
            sourceHandle: 'nodeJS_0-output-0',
            target: 'nodeJS_1',
            targetHandle: 'nodeJS_1-input-0',
            type: 'buttonedge',
            id: 'nodeJS_0-nodeJS_0-output-0-nodeJS_1-nodeJS_1-input-0',
            data: {
                label: ''
            }
        },
        {
            source: 'webhook_0',
            sourceHandle: 'webhook_0-output-0',
            target: 'wait_0',
            targetHandle: 'wait_0-input-0',
            type: 'buttonedge',
            id: 'webhook_0-webhook_0-output-0-wait_0-wait_0-input-0',
            data: {
                label: ''
            }
        },
        {
            source: 'wait_0',
            sourceHandle: 'wait_0-output-0',
            target: 'nodeJS_0',
            targetHandle: 'nodeJS_0-input-0',
            type: 'buttonedge',
            id: 'wait_0-wait_0-output-0-nodeJS_0-nodeJS_0-input-0',
            data: {
                label: ''
            }
        }
    ]
}
