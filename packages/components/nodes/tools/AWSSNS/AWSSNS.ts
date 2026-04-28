import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { AWS_REGIONS, DEFAULT_AWS_REGION, getAWSCredentials } from '../../../src/awsToolsUtils'
import { SNSClient, ListTopicsCommand, PublishCommand } from '@aws-sdk/client-sns'

class AWSSNSTool extends Tool {
    name = 'aws_sns_publish'
    description = 'Publishes a message to an AWS SNS topic'
    private snsClient: SNSClient
    private topicArn: string

    constructor(snsClient: SNSClient, topicArn: string) {
        super()
        this.snsClient = snsClient
        this.topicArn = topicArn
    }

    async _call(message: string): Promise<string> {
        try {
            const command = new PublishCommand({
                TopicArn: this.topicArn,
                Message: message
            })

            const response = await this.snsClient.send(command)
            return `Successfully published message to SNS topic. MessageId: ${response.MessageId}`
        } catch (error) {
            return `Failed to publish message to SNS: ${error}`
        }
    }
}

class AWSSNS_Tools implements INode {
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
        this.label = 'AWS SNS'
        this.name = 'awsSNS'
        this.version = 1.0
        this.type = 'AWSSNS'
        this.icon = 'awssns.svg'
        this.category = 'Tools'
        this.description = 'Publish messages to AWS SNS topics'
        this.baseClasses = [this.type, ...getBaseClasses(AWSSNSTool)]
        this.credential = {
            label: 'AWS Credentials',
            name: 'credential',
            type: 'credential',
            credentialNames: ['awsApi']
        }
        this.inputs = [
            {
                label: 'AWS Region',
                name: 'region',
                type: 'options',
                options: AWS_REGIONS,
                default: DEFAULT_AWS_REGION,
                description: 'AWS Region where your SNS topics are located'
            },
            {
                label: 'SNS Topic',
                name: 'topicArn',
                type: 'asyncOptions',
                loadMethod: 'listTopics',
                description: 'Select the SNS topic to publish to',
                refresh: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        listTopics: async (nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> => {
            try {
                const credentials = await getAWSCredentials(nodeData, options ?? {})
                const region = (nodeData.inputs?.region as string) || DEFAULT_AWS_REGION

                const snsClient = new SNSClient({
                    region: region,
                    credentials: credentials
                })

                const command = new ListTopicsCommand({})
                const response = await snsClient.send(command)

                if (!response.Topics || response.Topics.length === 0) {
                    return [
                        {
                            label: 'No topics found',
                            name: 'placeholder',
                            description: 'No SNS topics found in this region'
                        }
                    ]
                }

                return response.Topics.map((topic) => {
                    const topicArn = topic.TopicArn || ''
                    const topicName = topicArn.split(':').pop() || topicArn
                    return {
                        label: topicName,
                        name: topicArn,
                        description: topicArn
                    }
                })
            } catch (error) {
                console.error('Error loading SNS topics:', error)
                return [
                    {
                        label: 'AWS Credentials Required',
                        name: 'placeholder',
                        description: 'Enter AWS Access Key ID and Secret Access Key'
                    }
                ]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentials = await getAWSCredentials(nodeData, options)
        const region = (nodeData.inputs?.region as string) || DEFAULT_AWS_REGION
        const topicArn = nodeData.inputs?.topicArn as string

        if (!topicArn) {
            throw new Error('SNS Topic ARN is required')
        }

        const snsClient = new SNSClient({
            region: region,
            credentials: credentials
        })

        return new AWSSNSTool(snsClient, topicArn)
    }
}

module.exports = { nodeClass: AWSSNS_Tools }
