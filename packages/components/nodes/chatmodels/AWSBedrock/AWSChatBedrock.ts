import { BaseCache } from '@langchain/core/caches'
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { BaseBedrockInput } from '@langchain/community/dist/utils/bedrock'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { BedrockChat } from './FlowiseAWSChatBedrock'

/**
 * @author Michael Connor <mlconnor@yahoo.com>
 */
class AWSChatBedrock_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'AWS ChatBedrock'
        this.name = 'awsChatBedrock'
        this.version = 4.0
        this.type = 'AWSChatBedrock'
        this.icon = 'aws.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around AWS Bedrock large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(BedrockChat)]
        this.credential = {
            label: 'AWS Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['awsApi'],
            optional: true
        }
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
                type: 'options',
                options: [
                    { label: 'af-south-1', name: 'af-south-1' },
                    { label: 'ap-east-1', name: 'ap-east-1' },
                    { label: 'ap-northeast-1', name: 'ap-northeast-1' },
                    { label: 'ap-northeast-2', name: 'ap-northeast-2' },
                    { label: 'ap-northeast-3', name: 'ap-northeast-3' },
                    { label: 'ap-south-1', name: 'ap-south-1' },
                    { label: 'ap-south-2', name: 'ap-south-2' },
                    { label: 'ap-southeast-1', name: 'ap-southeast-1' },
                    { label: 'ap-southeast-2', name: 'ap-southeast-2' },
                    { label: 'ap-southeast-3', name: 'ap-southeast-3' },
                    { label: 'ap-southeast-4', name: 'ap-southeast-4' },
                    { label: 'ap-southeast-5', name: 'ap-southeast-5' },
                    { label: 'ap-southeast-6', name: 'ap-southeast-6' },
                    { label: 'ca-central-1', name: 'ca-central-1' },
                    { label: 'ca-west-1', name: 'ca-west-1' },
                    { label: 'cn-north-1', name: 'cn-north-1' },
                    { label: 'cn-northwest-1', name: 'cn-northwest-1' },
                    { label: 'eu-central-1', name: 'eu-central-1' },
                    { label: 'eu-central-2', name: 'eu-central-2' },
                    { label: 'eu-north-1', name: 'eu-north-1' },
                    { label: 'eu-south-1', name: 'eu-south-1' },
                    { label: 'eu-south-2', name: 'eu-south-2' },
                    { label: 'eu-west-1', name: 'eu-west-1' },
                    { label: 'eu-west-2', name: 'eu-west-2' },
                    { label: 'eu-west-3', name: 'eu-west-3' },
                    { label: 'il-central-1', name: 'il-central-1' },
                    { label: 'me-central-1', name: 'me-central-1' },
                    { label: 'me-south-1', name: 'me-south-1' },
                    { label: 'sa-east-1', name: 'sa-east-1' },
                    { label: 'us-east-1', name: 'us-east-1' },
                    { label: 'us-east-2', name: 'us-east-2' },
                    { label: 'us-gov-east-1', name: 'us-gov-east-1' },
                    { label: 'us-gov-west-1', name: 'us-gov-west-1' },
                    { label: 'us-west-1', name: 'us-west-1' },
                    { label: 'us-west-2', name: 'us-west-2' }
                ],
                default: 'us-east-1'
            },
            {
                label: 'Model Name',
                name: 'model',
                type: 'options',
                options: [
                    { label: 'anthropic.claude-3-haiku', name: 'anthropic.claude-3-haiku-20240307-v1:0' },
                    { label: 'anthropic.claude-3-sonnet', name: 'anthropic.claude-3-sonnet-20240229-v1:0' },
                    { label: 'anthropic.claude-instant-v1', name: 'anthropic.claude-instant-v1' },
                    { label: 'anthropic.claude-v2:1', name: 'anthropic.claude-v2:1' },
                    { label: 'anthropic.claude-v2', name: 'anthropic.claude-v2' },
                    { label: 'meta.llama2-13b-chat-v1', name: 'meta.llama2-13b-chat-v1' },
                    { label: 'meta.llama2-70b-chat-v1', name: 'meta.llama2-70b-chat-v1' },
                    { label: 'mistral.mistral-7b-instruct-v0:2', name: 'mistral.mistral-7b-instruct-v0:2' },
                    { label: 'mistral.mixtral-8x7b-instruct-v0:1', name: 'mistral.mixtral-8x7b-instruct-v0:1' }
                ],
                default: 'anthropic.claude-3-haiku'
            },
            {
                label: 'Custom Model Name',
                name: 'customModel',
                description: 'If provided, will override model selected from Model Name option',
                type: 'string',
                optional: true
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
                    'Only works with claude-3-* models when image is being uploaded from chat. Compatible with LLMChain, Conversation Chain, ReAct Agent, and Conversational Agent',
                default: false,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const iRegion = nodeData.inputs?.region as string
        const iModel = nodeData.inputs?.model as string
        const customModel = nodeData.inputs?.customModel as string
        const iTemperature = nodeData.inputs?.temperature as string
        const iMax_tokens_to_sample = nodeData.inputs?.max_tokens_to_sample as string
        const cache = nodeData.inputs?.cache as BaseCache
        const streaming = nodeData.inputs?.streaming as boolean

        const obj: BaseBedrockInput & BaseChatModelParams = {
            region: iRegion,
            model: customModel ? customModel : iModel,
            maxTokens: parseInt(iMax_tokens_to_sample, 10),
            temperature: parseFloat(iTemperature),
            streaming: streaming ?? true
        }

        /**
         * Long-term credentials specified in LLM configuration are optional.
         * Bedrock's credential provider falls back to the AWS SDK to fetch
         * credentials from the running environment.
         * When specified, we override the default provider with configured values.
         * @see https://github.com/aws/aws-sdk-js-v3/blob/main/packages/credential-provider-node/README.md
         */
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        if (credentialData && Object.keys(credentialData).length !== 0) {
            const credentialApiKey = getCredentialParam('awsKey', credentialData, nodeData)
            const credentialApiSecret = getCredentialParam('awsSecret', credentialData, nodeData)
            const credentialApiSession = getCredentialParam('awsSession', credentialData, nodeData)

            obj.credentials = {
                accessKeyId: credentialApiKey,
                secretAccessKey: credentialApiSecret,
                sessionToken: credentialApiSession
            }
        }
        if (cache) obj.cache = cache

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false
            }
        }

        const amazonBedrock = new BedrockChat(nodeData.id, obj)
        if (obj.model.includes('anthropic.claude-3')) amazonBedrock.setMultiModalOption(multiModalOption)
        return amazonBedrock
    }
}

module.exports = { nodeClass: AWSChatBedrock_ChatModels }
