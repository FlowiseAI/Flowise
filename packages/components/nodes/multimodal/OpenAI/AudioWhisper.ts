import { INode, INodeData, INodeParams } from '../../../src'

class OpenAIAudioWhisper implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    badge: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Open AI Whisper'
        this.name = 'openAIAudioWhisper'
        this.version = 1.0
        this.type = 'OpenAIWhisper'
        this.description = 'Speech to text using OpenAI Whisper API'
        this.icon = 'audio.svg'
        this.badge = 'BETA'
        this.category = 'MultiModal'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Purpose',
                name: 'purpose',
                type: 'options',
                options: [
                    {
                        label: 'Transcription',
                        name: 'transcription'
                    },
                    {
                        label: 'Translation',
                        name: 'translation'
                    }
                ],
                default: 'transcription'
            },
            {
                label: 'Accepted Upload Types',
                name: 'allowedUploadTypes',
                type: 'string',
                default: 'audio/mpeg;audio/x-wav;audio/mp4',
                hidden: true
            },
            {
                label: 'Maximum Upload Size (MB)',
                name: 'maxUploadSize',
                type: 'number',
                default: '5',
                hidden: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const purpose = nodeData.inputs?.purpose as string

        return { purpose }
    }
}

module.exports = { nodeClass: OpenAIAudioWhisper }
