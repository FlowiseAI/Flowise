import { STSClient, AssumeRoleCommand, AssumeRoleCommandInput } from '@aws-sdk/client-sts'
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

// AWS Credential Config interface (returned by getAWSCredentialConfig)
export interface AWSCredentialConfig {
    credentials?: AWSCredentials
    region?: string
}

/**
 * Regex to validate AWS IAM Role ARN format.
 * Supports standard AWS partitions (aws, aws-cn, aws-us-gov).
 * Format: arn:<partition>:iam::<account-id>:role/<role-path-and-name>
 */
const AWS_ROLE_ARN_REGEX = /^arn:aws(-[a-z]+(-[a-z]+)?)?:iam::\d{12}:role\/[\w+=,.@/-]+$/

/**
 * Get AWS credential configuration from node data, supporting both static credentials
 * and STS AssumeRole flows.
 *
 * This is the **primary entry point** for all AWS nodes to obtain credentials. It handles
 * three scenarios:
 *
 * 1. **AssumeRole** — When `roleArn` is present in the credential, calls STS `AssumeRole`
 *    using either the provided static keys or the SDK default credential chain as base
 *    credentials, and returns temporary session credentials.
 * 2. **Static credentials** — When `awsKey` and `awsSecret` are present (no `roleArn`),
 *    returns them directly (backward-compatible with pre-AssumeRole behavior).
 * 3. **SDK default chain** — When neither keys nor `roleArn` are provided, returns
 *    `{ credentials: undefined }` so the caller can fall back to the AWS SDK default
 *    credential provider chain (EC2 instance profile, EKS IRSA, environment variables, etc.).
 *
 * @param {INodeData} nodeData - Node data containing credential information
 * @param {ICommonObject} options - Options containing appDataSource and databaseEntities
 * @param {string} [region] - AWS region (defaults to DEFAULT_AWS_REGION)
 * @returns {Promise<AWSCredentialConfig>} Resolved credential configuration with optional
 *   `credentials` and `region` fields
 * @throws {Error} If STS AssumeRole fails (e.g., access denied, invalid Role ARN, wrong
 *   External ID) — the error message includes the Role ARN and troubleshooting guidance
 */
export async function getAWSCredentialConfig(nodeData: INodeData, options: ICommonObject, region?: string): Promise<AWSCredentialConfig> {
    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const awsRegion = region || DEFAULT_AWS_REGION

    // Handle empty credential data (no credential attached to node)
    if (!credentialData || Object.keys(credentialData).length === 0) {
        return { credentials: undefined, region: awsRegion }
    }

    const accessKeyId = getCredentialParam('awsKey', credentialData, nodeData)
    const secretAccessKey = getCredentialParam('awsSecret', credentialData, nodeData)
    const sessionToken = getCredentialParam('awsSession', credentialData, nodeData)
    const roleArn = getCredentialParam('roleArn', credentialData, nodeData)
    const externalId = getCredentialParam('externalId', credentialData, nodeData)

    // --- AssumeRole flow ---
    if (roleArn) {
        if (!AWS_ROLE_ARN_REGEX.test(roleArn)) {
            throw new Error(
                `Invalid Role ARN format: "${roleArn}". ` + 'Expected format: arn:aws:iam::<12-digit-account-id>:role/<role-name>'
            )
        }
        const assumedCredentials = await assumeRole({
            accessKeyId,
            secretAccessKey,
            sessionToken,
            roleArn,
            externalId,
            region: awsRegion
        })
        return { credentials: assumedCredentials, region: awsRegion }
    }

    // --- Static credentials flow (backward-compatible) ---
    if (accessKeyId && secretAccessKey) {
        const credentials: AWSCredentials = {
            accessKeyId,
            secretAccessKey,
            ...(sessionToken && { sessionToken })
        }
        return { credentials, region: awsRegion }
    }

    // No explicit keys and no role — let SDK use default chain
    return { credentials: undefined, region: awsRegion }
}

/**
 * Assume an IAM role using AWS STS and return temporary session credentials.
 *
 * This is an internal helper called by {@link getAWSCredentialConfig} when a `roleArn`
 * is present. It creates an STS client with the provided base credentials (or the SDK
 * default credential chain if none are supplied), then sends an `AssumeRoleCommand`.
 *
 * The session is named `FlowiseSession-{timestamp}` for CloudTrail audit traceability.
 * Temporary credentials are valid for 1 hour (the STS default).
 *
 * @param params - Parameters for the AssumeRole call
 * @param params.accessKeyId - Optional base access key ID (omit to use SDK default chain)
 * @param params.secretAccessKey - Optional base secret access key
 * @param params.sessionToken - Optional base session token
 * @param params.roleArn - The ARN of the IAM role to assume (required)
 * @param params.externalId - Optional external ID for cross-account trust policies
 *   that include an `sts:ExternalId` condition
 * @param params.region - AWS region for the STS endpoint
 * @returns {Promise<AWSCredentials>} Temporary credentials (`accessKeyId`,
 *   `secretAccessKey`, `sessionToken`) from the assumed role
 * @throws {Error} When STS returns incomplete credentials (missing AccessKeyId,
 *   SecretAccessKey, or SessionToken)
 * @throws {Error} When the STS API call fails — the error message includes the Role ARN,
 *   the original error, and troubleshooting guidance
 */
async function assumeRole(params: {
    accessKeyId?: string
    secretAccessKey?: string
    sessionToken?: string
    roleArn: string
    externalId?: string
    region: string
}): Promise<AWSCredentials> {
    const { accessKeyId, secretAccessKey, sessionToken, roleArn, externalId, region } = params

    // Build STS client config
    const stsConfig: Record<string, any> = { region }

    // Use explicit credentials if provided; otherwise SDK default chain
    if (accessKeyId && secretAccessKey) {
        stsConfig.credentials = {
            accessKeyId,
            secretAccessKey,
            ...(sessionToken && { sessionToken })
        }
    }

    const stsClient = new STSClient(stsConfig)

    const assumeRoleInput: AssumeRoleCommandInput = {
        RoleArn: roleArn,
        RoleSessionName: `FlowiseSession-${Date.now()}`
    }

    if (externalId) {
        assumeRoleInput.ExternalId = externalId
    }

    try {
        const response = await stsClient.send(new AssumeRoleCommand(assumeRoleInput))

        if (!response.Credentials?.AccessKeyId || !response.Credentials?.SecretAccessKey || !response.Credentials?.SessionToken) {
            throw new Error('STS AssumeRole returned incomplete credentials')
        }

        return {
            accessKeyId: response.Credentials.AccessKeyId,
            secretAccessKey: response.Credentials.SecretAccessKey,
            sessionToken: response.Credentials.SessionToken
        }
    } catch (error) {
        if (error instanceof Error && error.message === 'STS AssumeRole returned incomplete credentials') {
            throw error
        }
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(
            `Failed to assume IAM role "${roleArn}": ${message}. ` +
                'Verify that the Role ARN is correct, the trust policy allows assumption from these credentials, ' +
                'and the External ID matches (if required).'
        )
    }
}

/**
 * Get AWS credentials from node data (backward-compatible wrapper).
 *
 * This function preserves the original API used by **Pattern A** nodes (AWS SNS,
 * DynamoDB KV Storage) that expect an `AWSCredentials` object. Internally it delegates
 * to {@link getAWSCredentialConfig} and unwraps the credentials.
 *
 * **Behavior change in v2.0**: When a `roleArn` is configured, this function now
 * transparently returns temporary credentials from STS AssumeRole instead of throwing.
 * When neither static keys nor a `roleArn` are provided, it throws as before.
 *
 * @param {INodeData} nodeData - Node data containing credential information
 * @param {ICommonObject} options - Options containing appDataSource and databaseEntities
 * @returns {Promise<AWSCredentials>} Resolved credentials (static or from STS AssumeRole)
 * @throws {Error} When no credentials can be resolved (no keys and no roleArn) —
 *   "AWS Access Key ID and Secret Access Key are required"
 * @throws {Error} When STS AssumeRole fails (propagated from {@link getAWSCredentialConfig})
 */
export async function getAWSCredentials(nodeData: INodeData, options: ICommonObject): Promise<AWSCredentials> {
    const config = await getAWSCredentialConfig(nodeData, options)

    if (!config.credentials) {
        throw new Error('AWS Access Key ID and Secret Access Key are required')
    }

    return config.credentials
}
