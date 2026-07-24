import { ICommonObject, INode, INodeData, INodeParams, IServerSideEventStreamer } from '../../../src/Interface'
import { flatten } from 'lodash'

const parseArtifacts = (value: unknown): ICommonObject[] => {
    let artifacts = value

    if (typeof artifacts === 'string') {
        const trimmedValue = artifacts.trim()
        if (!trimmedValue) return []

        try {
            artifacts = JSON.parse(trimmedValue)
        } catch {
            return []
        }
    }

    const flattenedArtifacts = Array.isArray(artifacts) ? flatten(artifacts) : [artifacts]
    return flattenedArtifacts.filter(
        (artifact): artifact is ICommonObject =>
            typeof artifact === 'object' &&
            artifact !== null &&
            typeof (artifact as ICommonObject).type === 'string' &&
            typeof (artifact as ICommonObject).data === 'string'
    )
}

class DirectReply_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    hideOutput: boolean
    hint: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Direct Reply'
        this.name = 'directReplyAgentflow'
        this.version = 1.0
        this.type = 'DirectReply'
        this.category = 'Agent Flows'
        this.description = 'Directly reply to the user with a message'
        this.baseClasses = [this.type]
        this.color = '#4DDBBB'
        this.hideOutput = true
        this.inputs = [
            {
                label: 'Message',
                name: 'directReplyMessage',
                type: 'string',
                rows: 4,
                acceptVariable: true,
                acceptNodeOutputAsVariable: true
            },
            {
                label: 'Artifacts',
                name: 'directReplyArtifacts',
                type: 'string',
                optional: true,
                acceptVariable: true,
                acceptNodeOutputAsVariable: true
            }
        ]
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const directReplyMessage = nodeData.inputs?.directReplyMessage as string
        const directReplyArtifacts = nodeData.inputs?.directReplyArtifacts

        const state = options.agentflowRuntime?.state as ICommonObject
        const chatId = options.chatId as string
        const isLastNode = options.isLastNode as boolean
        const isStreamable = isLastNode && options.sseStreamer !== undefined
        const artifacts = parseArtifacts(directReplyArtifacts)
        const messageArtifacts = artifacts.length > 0 ? [] : parseArtifacts(directReplyMessage)
        const resolvedArtifacts = artifacts.length > 0 ? artifacts : messageArtifacts
        const outputContent = messageArtifacts.length > 0 && directReplyMessage?.trim() ? ' ' : directReplyMessage

        if (isStreamable) {
            const sseStreamer: IServerSideEventStreamer = options.sseStreamer
            if (outputContent?.trim()) {
                sseStreamer.streamTokenEvent(chatId, outputContent)
            }
            if (resolvedArtifacts.length > 0) {
                sseStreamer.streamArtifactsEvent(chatId, resolvedArtifacts)
            }
        }

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: {},
            output: {
                content: outputContent,
                ...(resolvedArtifacts.length > 0 && { artifacts: resolvedArtifacts })
            },
            state
        }

        return returnOutput
    }
}

module.exports = { nodeClass: DirectReply_Agentflow }
