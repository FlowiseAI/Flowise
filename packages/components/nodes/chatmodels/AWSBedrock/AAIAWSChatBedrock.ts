import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { getModels, getRegions, MODEL_TYPE } from '../../../src/modelLoader'
import { ChatBedrockConverseInput, ChatBedrockConverse } from '@langchain/aws'
import { BedrockChat } from './FlowiseAWSChatBedrock'

/**
 * AAI version of AWS ChatBedrock that uses hardcoded AAI default credentials
 * @author Michael Connor <mlconnor@yahoo.com>
 */
class AAIAWSChatBedrock_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]
    tags: string[]
    
    constructor() {
        this.label = 'AAI AWS ChatBedrock'
        this.name = 'aaiAwsChatBedrock'
        this.tags = ['AAI']
        this.version = 1.0
        this.type = 'AAIAWSChatBedrock'
        this.icon = 'aws.svg'
        this.category = 'Chat Models'
        this.description = 'AWS Bedrock models • Zero configuration required'
        this.baseClasses = [this.type, ...getBaseClasses(ChatBedrockConverse)]
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Region',
                name: 'region',
                type: 'asyncOptions',
                loadMethod: 'listRegions',
                default: 'us-east-1'
            },
            {
                label: 'Model Name',
                name: 'model',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'anthropic.claude-3-haiku-20240307-v1:0'
            },
            {
                label: 'Custom Model Name',
                name: 'customModel',
                description: 'If provided, will override model selected from Model Name option',
                type: 'string',
                optional: true
            },
            {
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description: 'Temperature parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true,
                default: 0.7
            },
            {
                label: 'Max Tokens to Sample',
                name: 'max_tokens_to_sample',
                type: 'number',
                step: 10,
                description: 'Max Tokens parameter may not apply to certain model. Please check available model parameters',
                optional: true,
                additionalParams: true,
                default: 200
            },
            {
                label: 'Allow Image Uploads',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Allow image input. Refer to the <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank">docs</a> for more details.',
                default: false,
                optional: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'awsChatBedrock')
        },
        async listRegions(): Promise<INodeOptionsValue[]> {
            return await getRegions(MODEL_TYPE.CHAT, 'awsChatBedrock')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const iRegion = nodeData.inputs?.region as string
        const iModel = nodeData.inputs?.model as string
        const customModel = nodeData.inputs?.customModel as string
        const iTemperature = nodeData.inputs?.temperature as string
        const iMax_tokens_to_sample = nodeData.inputs?.max_tokens_to_sample as string
        const cache = nodeData.inputs?.cache as BaseCache
        const streaming = nodeData.inputs?.streaming as boolean

        const obj: ChatBedrockConverseInput = {
            region: iRegion,
            model: customModel ? customModel : iModel,
            maxTokens: parseInt(iMax_tokens_to_sample, 10),
            temperature: parseFloat(iTemperature),
            streaming: streaming ?? true
        }

        // Use AAI default credentials instead of user-provided credentials
        const credentialApiKey = process.env.AAI_DEFAULT_AWS_BEDROCK_ACCESS_KEY
        const credentialApiSecret = process.env.AAI_DEFAULT_AWS_BEDROCK_SECRET_KEY
        const credentialApiSession = process.env.AAI_DEFAULT_AWS_BEDROCK_SESSION_TOKEN

        if (!credentialApiKey || !credentialApiSecret) {
            throw new Error('AAI_DEFAULT_AWS_BEDROCK_ACCESS_KEY and AAI_DEFAULT_AWS_BEDROCK_SECRET_KEY environment variables are required')
        }

        obj.credentials = {
            accessKeyId: credentialApiKey,
            secretAccessKey: credentialApiSecret,
            sessionToken: credentialApiSession // Optional - can be undefined
        }

        if (cache) obj.cache = cache

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false
            }
        }

        const amazonBedrock = new BedrockChat(nodeData.id, obj)
        amazonBedrock.setMultiModalOption(multiModalOption)
        return amazonBedrock
    }
}

module.exports = { nodeClass: AAIAWSChatBedrock_ChatModels } 