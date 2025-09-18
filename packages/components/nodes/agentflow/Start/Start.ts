import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class Start_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    hideInput: boolean
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Start'
        this.name = 'startAgentflow'
        this.version = 1.1
        this.type = 'Start'
        this.category = 'Agent Flows'
        this.description = 'Starting point of the agentflow'
        this.baseClasses = [this.type]
        this.color = '#7EE787'
        this.hideInput = true
        this.inputs = [
            {
                label: 'Input Type',
                name: 'startInputType',
                type: 'options',
                options: [
                    {
                        label: 'Chat Input',
                        name: 'chatInput',
                        description: 'Start the conversation with chat input'
                    },
                    {
                        label: 'Form Input',
                        name: 'formInput',
                        description: 'Start the workflow with form inputs'
                    }
                ],
                default: 'chatInput'
            },
            {
                label: 'Form Title',
                name: 'formTitle',
                type: 'string',
                placeholder: 'Please Fill Out The Form',
                show: {
                    startInputType: 'formInput'
                }
            },
            {
                label: 'Form Description',
                name: 'formDescription',
                type: 'string',
                placeholder: 'Complete all fields below to continue',
                show: {
                    startInputType: 'formInput'
                }
            },
            {
                label: 'Form Input Types',
                name: 'formInputTypes',
                description: 'Specify the type of form input',
                type: 'array',
                show: {
                    startInputType: 'formInput'
                },
                array: [
                    {
                        label: 'Type',
                        name: 'type',
                        type: 'options',
                        options: [
                            {
                                label: 'String',
                                name: 'string'
                            },
                            {
                                label: 'Number',
                                name: 'number'
                            },
                            {
                                label: 'Boolean',
                                name: 'boolean'
                            },
                            {
                                label: 'Options',
                                name: 'options'
                            }
                        ],
                        default: 'string'
                    },
                    {
                        label: 'Label',
                        name: 'label',
                        type: 'string',
                        placeholder: 'Label for the input'
                    },
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
                        show: {
                            'formInputTypes[$index].type': 'options'
                        },
                        array: [
                            {
                                label: 'Option',
                                name: 'option',
                                type: 'string'
                            }
                        ]
                    }
                ]
            },
            {
                label: 'Ephemeral Memory',
                name: 'startEphemeralMemory',
                type: 'boolean',
                description: 'Start fresh for every execution without past chat history',
                optional: true
            },
            {
                label: 'Flow State',
                name: 'startState',
                description: 'Runtime state during the execution of the workflow',
                type: 'array',
                optional: true,
                array: [
                    {
                        label: 'Key',
                        name: 'key',
                        type: 'string',
                        placeholder: 'Foo'
                    },
                    {
                        label: 'Value',
                        name: 'value',
                        type: 'string',
                        placeholder: 'Bar',
                        optional: true
                    }
                ]
            },
            {
                label: 'Persist State',
                name: 'startPersistState',
                type: 'boolean',
                description: 'Persist the state in the same session',
                optional: true
            }
        ]
    }

    async run(nodeData: INodeData, input: string | Record<string, any>, options: ICommonObject): Promise<any> {
        const _flowState = nodeData.inputs?.startState as string
        const startInputType = nodeData.inputs?.startInputType as string
        const startEphemeralMemory = nodeData.inputs?.startEphemeralMemory as boolean
        const startPersistState = nodeData.inputs?.startPersistState as boolean

        let flowStateArray = []
        if (_flowState) {
            try {
                flowStateArray = typeof _flowState === 'string' ? JSON.parse(_flowState) : _flowState
            } catch (error) {
                throw new Error('Invalid Flow State')
            }
        }

        let flowState: Record<string, any> = {}
        for (const state of flowStateArray) {
            flowState[state.key] = state.value
        }

        const runtimeState = options.agentflowRuntime?.state as ICommonObject
        if (startPersistState === true && runtimeState && Object.keys(runtimeState).length) {
            for (const state in runtimeState) {
                flowState[state] = runtimeState[state]
            }
        }

        const inputData: ICommonObject = {}
        const outputData: ICommonObject = {}

        if (startInputType === 'chatInput') {
            inputData.question = input
            outputData.question = input
        }

        if (startInputType === 'formInput') {
            inputData.form = {
                title: nodeData.inputs?.formTitle,
                description: nodeData.inputs?.formDescription,
                inputs: nodeData.inputs?.formInputTypes
            }

            let form = input
            if (options.agentflowRuntime?.form && Object.keys(options.agentflowRuntime.form).length) {
                form = options.agentflowRuntime.form
            }
            outputData.form = form
        }

        if (startEphemeralMemory) {
            outputData.ephemeralMemory = true
        }

        if (startPersistState) {
            outputData.persistState = true
        }

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: inputData,
            output: outputData,
            state: flowState
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Start_Agentflow }
