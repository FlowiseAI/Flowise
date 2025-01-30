import { RunnableConfig } from '@langchain/core/runnables'
import { AIMessage } from '@langchain/core/messages'
import {
    INode,
    INodeData,
    INodeParams,
    ISeqAgentsState,
    ICommonObject,
    INodeOutputsValue,
    ISeqAgentNode,
    IActionRequest
} from '../../../src/Interface'
import { enhancePrompt } from './core'
import { createActionRequest, isActionRequestCompleted } from '../commonUtils'
import { actionRequestToString, formatActionRequestResponse } from '../../../src/utils'

class HumanInTheLoop_SeqAgents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[] = [
        {
            label: 'Output',
            name: 'output',
            baseClasses: ['string', 'object']
        }
    ]

    constructor() {
        this.label = 'Human In The Loop'
        this.name = 'humanInTheLoop'
        this.version = 1.0
        this.type = 'HumanInTheLoop'
        this.icon = 'hil.svg'
        this.category = 'Sequential Agents'
        this.description = 'Request human input with structured output formats'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Name',
                name: 'hilNodeName',
                type: 'string',
                placeholder: 'My HIL Node'
            },
            {
                label: 'Question/Task',
                name: 'question',
                type: 'string',
                rows: 4,
                placeholder: 'Please review and approve this content...'
            },
            {
                label: 'Output Types',
                name: 'outputTypes',
                type: 'options',
                options: [
                    {
                        label: 'Chat Message',
                        name: 'chat',
                        description: 'Simple chat message with optional response options'
                    },
                    {
                        label: 'Email',
                        name: 'email',
                        description: 'Structured email format with recipients and content'
                    },
                    {
                        label: 'Custom Schema',
                        name: 'custom',
                        description: 'User-defined structured output format'
                    }
                ],
                list: true
            },
            {
                label: 'Sequential Node',
                name: 'sequentialNode',
                type: 'SeqAgentNode',
                list: true,
                description: 'Can be connected to one of the following nodes: Start, Agent, Condition, LLM, Tool Node, Custom Function, Execute Flow'
            },
            {
                label: 'Chat Options',
                name: 'chatConfig',
                type: 'json',
                optional: true,
                description: 'Configure chat response options if needed',
                default: {
                    responseOptions: ['approve', 'reject', 'revise']
                },
                additionalParams: true
            },
            {
                label: 'Email Template',
                name: 'emailConfig',
                type: 'json',
                optional: true,
                description: 'Configure email defaults/template if needed',
                default: {
                    subjectPrefix: '[Action Required]',
                    includeAttachments: true
                },
                additionalParams: true
            },
            {
                label: 'Custom Schema',
                name: 'customSchema',
                type: 'datagrid',
                description: 'Define custom output schema',
                datagrid: [
                    { field: 'key', headerName: 'Key', editable: true },
                    { field: 'type', headerName: 'Type', editable: true },
                    { field: 'description', headerName: 'Description', editable: true }
                ],
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const question = nodeData.inputs?.question as string
        const outputTypes = nodeData.inputs?.outputTypes as string[]
        const chatConfig = nodeData.inputs?.chatConfig
        const emailConfig = nodeData.inputs?.emailConfig
        const customSchema = nodeData.inputs?.customSchema

        if (!question) throw new Error('Question/Task is required')
        if (!outputTypes?.length) throw new Error('At least one output type must be selected')

        // Enhance prompt based on output types
        const prompt = enhancePrompt(question, outputTypes, {
            chatConfig,
            emailConfig,
            customSchema
        })

        const workerNode = async (state: ISeqAgentsState, config: RunnableConfig) => {
            try {
                // Create action request
                const actionRequest = await createActionRequest(
                    options.chatflowid,
                    options.sessionId,
                    nodeData.id,
                    outputTypes,
                    {
                        question: prompt,
                        metadata: state
                    }
                )

                // Log action request creation
                console.log(`Created ${actionRequestToString(actionRequest)}`)

                // Return interrupt state
                return {
                    messages: [
                        new AIMessage({
                            content: '',
                            additional_kwargs: {
                                nodeId: nodeData.id,
                                actionId: actionRequest.id,
                                interrupt: true,
                                outputTypes,
                                actionRequest: {
                                    id: actionRequest.id,
                                    status: actionRequest.status,
                                    outputTypes: actionRequest.output_types
                                }
                            }
                        })
                    ]
                }
            } catch (error) {
                console.error('Error in HumanInTheLoop node:', error)
                throw new Error(`Failed to create action request: ${error.message}`)
            }
        }

        return {
            id: nodeData.id,
            node: workerNode,
            name: 'humanInTheLoop',
            type: 'hil'
        }
    }
}

module.exports = { nodeClass: HumanInTheLoop_SeqAgents } 
