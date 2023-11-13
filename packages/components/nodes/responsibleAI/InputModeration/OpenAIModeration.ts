import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src'
import { Moderation } from '../ResponsibleAI'
import { OpenAIModerationRunner } from './OpenAIModerationRunner'

class OpenAIModeration implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Moderation - Open AI'
        this.name = 'inputModerationOpenAI'
        this.version = 1.0
        this.type = 'Moderation'
        this.icon = 'openai-moderation.png'
        this.category = 'Responsible AI'
        this.description = 'Check whether content complies with OpenAI usage policies.'
        this.baseClasses = [this.type, ...getBaseClasses(Moderation)]
        this.inputs = [
            {
                label: 'Moderation Checks',
                name: 'moderationConfig',
                type: 'options',
                default: 'useDefault',
                options: [
                    {
                        label: 'OpenAI Default',
                        name: 'useDefault'
                    },
                    {
                        label: 'Use Custom Threshold Values',
                        name: 'useCustom'
                    },
                    {
                        label: 'Combine OpenAI Default with Custom Threshold Values',
                        name: 'combineBoth'
                    }
                ]
            },
            {
                label: 'Error Message',
                name: 'moderationErrorMessage',
                type: 'string',
                rows: 2,
                default: "Cannot Process! Input violates OpenAI's content moderation policies.",
                optional: true
            },
            {
                label: 'Threshold Score - Sexual',
                name: 'catSexualThreshold',
                type: 'number',
                default: 0.01,
                additionalParams: true
            },
            {
                label: 'Threshold Score - Sexual/Minors',
                name: 'catSexualMinorsThreshold',
                type: 'number',
                default: 0.01,
                additionalParams: true
            },
            {
                label: 'Threshold Score - Hate',
                name: 'catHateThreshold',
                type: 'number',
                default: 0.01,
                additionalParams: true
            },
            {
                label: 'Threshold Score - Hate/Threatening',
                name: 'catHateThreateningThreshold',
                type: 'number',
                default: 0.01,
                additionalParams: true
            },
            {
                label: 'Threshold Score - Harassment',
                name: 'catHarassmentThreshold',
                type: 'number',
                default: 0.01,
                additionalParams: true
            },
            {
                label: 'Threshold Score - Harassment/Threatening',
                name: 'catHarassmentThreateningThreshold',
                type: 'number',
                default: 0.01,
                additionalParams: true
            },
            {
                label: 'Threshold Score - Self Harm',
                name: 'catSelfHarmThreshold',
                type: 'number',
                default: 0.01,
                additionalParams: true
            },
            {
                label: 'Threshold Score - Self-Harm/Intent',
                name: 'catSelfHarmIntentThreshold',
                type: 'number',
                default: 0.01,
                additionalParams: true
            },
            {
                label: 'Threshold Score - Self-Harm/Instructions',
                name: 'catSelfHarmInstructionsThreshold',
                type: 'number',
                default: 0.01,
                additionalParams: true
            },
            {
                label: 'Threshold Score - Violence',
                name: 'catViolenceThreshold',
                type: 'number',
                default: 0.01,
                additionalParams: true
            },
            {
                label: 'Threshold Score - Violence/Graphic',
                name: 'catViolenceGraphicThreshold',
                type: 'number',
                default: 0.01,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const runner = new OpenAIModerationRunner()
        this.inputs.forEach((value) => {
            if (value.additionalParams === true) {
                // remove thePrefix - 'cat'
                let categoryName = value.name.substring(3)
                // remove theSuffix - 'Threshold'
                categoryName = categoryName.substring(0, categoryName.length - 9)
                categoryName = categoryName.substring(0, 1).toLowerCase() + categoryName.substring(1)
                let categoryThreshold = nodeData.inputs ? nodeData.inputs[value.name] : value.default
                runner.setParameter(categoryName, parseFloat(categoryThreshold))
            } else {
                runner.setParameter(value.name, nodeData.inputs ? nodeData.inputs[value.name] : value.default)
            }
        })
        return runner
    }
}

module.exports = { nodeClass: OpenAIModeration }
