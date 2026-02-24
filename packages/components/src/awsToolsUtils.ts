import { ICommonObject, INodeData } from './Interface'
import { getCredentialData, getCredentialParam } from './utils'

// AWS Regions constant
export const AWS_REGIONS = [
    { label: 'US East (N. Virginia) - us-east-1', name: 'us-east-1' },
    { label: 'US East (Ohio) - us-east-2', name: 'us-east-2' },
    { label: 'US West (N. California) - us-west-1', name: 'us-west-1' },
    { label: 'US West (Oregon) - us-west-2', name: 'us-west-2' },
    { label: 'Africa (Cape Town) - af-south-1', name: 'af-south-1' },
    { label: 'Asia Pacific (Hong Kong) - ap-east-1', name: 'ap-east-1' },
    { label: 'Asia Pacific (Mumbai) - ap-south-1', name: 'ap-south-1' },
    { label: 'Asia Pacific (Osaka) - ap-northeast-3', name: 'ap-northeast-3' },
    { label: 'Asia Pacific (Seoul) - ap-northeast-2', name: 'ap-northeast-2' },
    { label: 'Asia Pacific (Singapore) - ap-southeast-1', name: 'ap-southeast-1' },
    { label: 'Asia Pacific (Sydney) - ap-southeast-2', name: 'ap-southeast-2' },
    { label: 'Asia Pacific (Tokyo) - ap-northeast-1', name: 'ap-northeast-1' },
    { label: 'Canada (Central) - ca-central-1', name: 'ca-central-1' },
    { label: 'Europe (Frankfurt) - eu-central-1', name: 'eu-central-1' },
    { label: 'Europe (Ireland) - eu-west-1', name: 'eu-west-1' },
    { label: 'Europe (London) - eu-west-2', name: 'eu-west-2' },
    { label: 'Europe (Milan) - eu-south-1', name: 'eu-south-1' },
    { label: 'Europe (Paris) - eu-west-3', name: 'eu-west-3' },
    { label: 'Europe (Stockholm) - eu-north-1', name: 'eu-north-1' },
    { label: 'Middle East (Bahrain) - me-south-1', name: 'me-south-1' },
    { label: 'South America (São Paulo) - sa-east-1', name: 'sa-east-1' }
]

export const DEFAULT_AWS_REGION = 'us-east-1'

// AWS Credentials interface
export interface AWSCredentials {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
}

/**
 * Get AWS credentials from node data
 * @param {INodeData} nodeData - Node data containing credential information
 * @param {ICommonObject} options - Options containing appDataSource and databaseEntities
 * @returns {Promise<AWSCredentials>} - AWS credentials object
 */
export async function getAWSCredentials(nodeData: INodeData, options: ICommonObject): Promise<AWSCredentials> {
    const credentialData = await getCredentialData(nodeData.credential ?? '', options)

    const accessKeyId = getCredentialParam('awsKey', credentialData, nodeData)
    const secretAccessKey = getCredentialParam('awsSecret', credentialData, nodeData)
    const sessionToken = getCredentialParam('awsSession', credentialData, nodeData)

    if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS Access Key ID and Secret Access Key are required')
    }

    const credentials: AWSCredentials = {
        accessKeyId,
        secretAccessKey
    }

    if (sessionToken) {
        credentials.sessionToken = sessionToken
    }

    return credentials
}
