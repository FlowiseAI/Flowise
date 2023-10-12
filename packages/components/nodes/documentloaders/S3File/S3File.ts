import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { S3Loader } from 'langchain/document_loaders/web/s3'
import { UnstructuredLoader } from 'langchain/document_loaders/fs/unstructured'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { S3Client, GetObjectCommand, S3ClientConfig } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import * as fsDefault from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

type S3Config = S3ClientConfig & {
    /** @deprecated Use the credentials object instead */
    accessKeyId?: string
    /** @deprecated Use the credentials object instead */
    secretAccessKey?: string
}

class S3_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs?: INodeParams[]

    constructor() {
        this.label = 'S3'
        this.name = 'S3'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 's3.svg'
        this.category = 'Document Loaders'
        this.description = 'Load Data from S3 Buckets'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'AWS Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['awsApi']
        }
        this.inputs = [
            {
                label: 'Bucket',
                name: 'bucketName',
                type: 'string'
            },
            {
                label: 'Object Key',
                name: 'keyName',
                type: 'string',
                description: 'The object key (or key name) that uniquely identifies object in an Amazon S3 bucket',
                placeholder: 'AI-Paper.pdf'
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
                label: 'Unstructured API URL',
                name: 'unstructuredAPIUrl',
                description:
                    'Your Unstructured.io URL. Read <a target="_blank" href="https://unstructured-io.github.io/unstructured/introduction.html#getting-started">more</a> on how to get started',
                type: 'string',
                default: 'http://localhost:8000/general/v0/general'
            },
            {
                label: 'Unstructured API KEY',
                name: 'unstructuredAPIKey',
                type: 'password',
                optional: true
            },
            {
                label: 'NarrativeText Only',
                name: 'narrativeTextOnly',
                description:
                    'Only load documents with NarrativeText metadata from Unstructured. See how Unstructured partition data <a target="_blank" href="https://unstructured-io.github.io/unstructured/bricks/partition.html#">here</a>',
                default: true,
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Metadata',
                name: 'metadata',
                type: 'json',
                optional: true,
                additionalParams: true
            }
        ]
    }
    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const bucketName = nodeData.inputs?.bucketName as string
        const keyName = nodeData.inputs?.keyName as string
        const region = nodeData.inputs?.region as string
        const unstructuredAPIUrl = nodeData.inputs?.unstructuredAPIUrl as string
        const unstructuredAPIKey = nodeData.inputs?.unstructuredAPIKey as string
        const metadata = nodeData.inputs?.metadata
        const narrativeTextOnly = nodeData.inputs?.narrativeTextOnly as boolean

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessKeyId = getCredentialParam('awsKey', credentialData, nodeData)
        const secretAccessKey = getCredentialParam('awsSecret', credentialData, nodeData)

        const loader = new S3Loader({
            bucket: bucketName,
            key: keyName,
            s3Config: {
                region,
                credentials: {
                    accessKeyId,
                    secretAccessKey
                }
            },
            unstructuredAPIURL: unstructuredAPIUrl,
            unstructuredAPIKey: unstructuredAPIKey
        })

        const s3Config: S3Config & {
            accessKeyId?: string
            secretAccessKey?: string
        } = {
            accessKeyId,
            secretAccessKey
        }

        loader.load = async () => {
            const tempDir = fsDefault.mkdtempSync(path.join(os.tmpdir(), 's3fileloader-'))

            const filePath = path.join(tempDir, keyName)

            try {
                const s3Client = new S3Client(s3Config)

                const getObjectCommand = new GetObjectCommand({
                    Bucket: bucketName,
                    Key: keyName
                })

                const response = await s3Client.send(getObjectCommand)

                const objectData = await new Promise<Buffer>((resolve, reject) => {
                    const chunks: Buffer[] = []

                    if (response.Body instanceof Readable) {
                        response.Body.on('data', (chunk: Buffer) => chunks.push(chunk))
                        response.Body.on('end', () => resolve(Buffer.concat(chunks)))
                        response.Body.on('error', reject)
                    } else {
                        reject(new Error('Response body is not a readable stream.'))
                    }
                })

                fsDefault.mkdirSync(path.dirname(filePath), { recursive: true })

                fsDefault.writeFileSync(filePath, objectData)
            } catch (e: any) {
                throw new Error(`Failed to download file ${keyName} from S3 bucket ${bucketName}: ${e.message}`)
            }

            try {
                const options = {
                    apiUrl: unstructuredAPIUrl,
                    apiKey: unstructuredAPIKey
                }

                const unstructuredLoader = new UnstructuredLoader(filePath, options)

                const docs = await unstructuredLoader.load()

                fsDefault.rmdirSync(path.dirname(filePath), { recursive: true })

                return docs
            } catch {
                fsDefault.rmdirSync(path.dirname(filePath), { recursive: true })
                throw new Error(`Failed to load file ${filePath} using unstructured loader.`)
            }
        }

        const docs = await loader.load()

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            const finaldocs = docs.map((doc) => {
                return {
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        ...parsedMetadata
                    }
                }
            })
            return narrativeTextOnly ? finaldocs.filter((doc) => doc.metadata.category === 'NarrativeText') : finaldocs
        }

        return narrativeTextOnly ? docs.filter((doc) => doc.metadata.category === 'NarrativeText') : docs
    }
}
module.exports = { nodeClass: S3_DocumentLoaders }
