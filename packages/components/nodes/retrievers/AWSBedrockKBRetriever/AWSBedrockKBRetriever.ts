import { AmazonKnowledgeBaseRetriever } from '@langchain/aws'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { RetrievalFilter } from '@aws-sdk/client-bedrock-agent-runtime'
import { getRegions, MODEL_TYPE } from '../../../src/modelLoader'

class AWSBedrockKBRetriever_Retrievers implements INode {
  label: string
  name: string
  version: number
  description: string
  type: string
  icon: string
  category: string
  baseClasses: string[]
  credential: INodeParams
  inputs: INodeParams[]

  constructor() {
    this.label = 'AWS Bedrock Knowledge Base Retriever'
    this.name = 'awsBedrockKBRetriever'
    this.version = 1.0
    this.type = 'AWSBedrockKBRetriever'
    this.icon = 'AWSBedrockKBRetriever.svg'
    this.category = 'Retrievers'
    this.description = 'Connect to AWS Bedrock Knowledge Base API and retrieve relevant chunks'
    this.baseClasses = [this.type, 'BaseRetriever']
    this.credential = {
      label: 'AWS Credential',
      name: 'credential',
      type: 'credential',
      credentialNames: ['awsApi'],
      optional: true
    }
    this.inputs = [
      {
        label: 'Region',
        name: 'region',
        type: 'asyncOptions',
        loadMethod: 'listRegions',
        default: 'us-east-1'
      },
      {
        label: 'Knowledge Base ID',
        name: 'knowledgeBaseID',
        type: 'string',
        optional: true
      },
      {
        label: 'Knowledge Base Files',
        name: 'knowledgeBaseFiles',
        type: 'string',
        optional: true
      },
      {
        label: 'Query',
        name: 'query',
        type: 'string',
        description: 'Query to retrieve documents from retriever. If not specified, user question will be used',
        optional: true,
        acceptVariable: true
      },
      {
        label: 'TopK',
        name: 'topK',
        type: 'number',
        description: 'Number of chunks to retrieve',
        optional: true,
        additionalParams: true,
        default: 10
      },
      {
        label: 'SearchType',
        name: 'searchType',
        type: 'options',
        description:
          'Knowledge Base search type. Possible values are HYBRID and SEMANTIC. If not specified, default will be used. Consult AWS documentation for more',
        options: [
          {
            label: 'HYBRID',
            name: 'HYBRID',
            description: 'Hybrid search type'
          },
          {
            label: 'SEMANTIC',
            name: 'SEMANTIC',
            description: 'Semantic search type'
          }
        ],
        optional: true,
        additionalParams: true,
        default: undefined
      },
      {
        label: 'Filter',
        name: 'filter',
        type: 'string',
        description: 'Knowledge Base retrieval filter. Read documentation for filter syntax',
        optional: true,
        additionalParams: true
      }
    ]
  }

  loadMethods = {
    // Reuse the AWS Bedrock Embeddings region list as it should be same for all Bedrock functions
    async listRegions(): Promise<INodeOptionsValue[]> {
      return await getRegions(MODEL_TYPE.EMBEDDING, 'AWSBedrockEmbeddings')
    }
  }

  async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
    let knowledgeBaseID = (nodeData.inputs?.knowledgeBaseID as string) || 'DRXXU5RCGD'
    const region = nodeData.inputs?.region as string
    const topK = parseInt(nodeData.inputs?.topK || 10) as number
    const overrideSearchType = (nodeData.inputs?.searchType != '' ? nodeData.inputs?.searchType : undefined) as 'HYBRID' | 'SEMANTIC'
    let filter = (nodeData.inputs?.filter != '' ? JSON.parse(nodeData.inputs?.filter) : undefined) as RetrievalFilter
    let credentialApiKey = ''
    let credentialApiSecret = ''
    let credentialApiSession = ''

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    if (credentialData && Object.keys(credentialData).length !== 0) {
      credentialApiKey = getCredentialParam('awsKey', credentialData, nodeData)
      credentialApiSecret = getCredentialParam('awsSecret', credentialData, nodeData)
      credentialApiSession = getCredentialParam('awsSession', credentialData, nodeData)
    }

    if (nodeData.inputs?.knowledgeBaseFiles && !filter) {
      try {
        let filterFiles: { key: string; name: string }[] = JSON.parse(nodeData.inputs?.knowledgeBaseFiles as string)
        const isRongViet = filterFiles.findIndex((item) => item.key.includes('rongviet-sample/')) !== -1

        if (isRongViet) {
          knowledgeBaseID = 'ZXQTGNJKV8'
        }

        if (filterFiles.length > 0) {
          const filterFolders = filterFiles.filter((item) => item.key.endsWith('/'))

          if (filterFolders.length > 0) {
            filterFiles = filterFiles.filter((item) => {
              return filterFolders.findIndex((folder) => item.key !== folder.key && item.key.includes(folder.key)) === -1
            })
          }

          const orAll = filterFiles.map(
            (item) =>
              ({
                stringContains: {
                  key: 'x-amz-bedrock-kb-source-uri',
                  value: item.key
                }
              } as RetrievalFilter)
          )

          if (orAll.length > 1) {
            filter = {
              orAll
            }
          } else if (orAll.length === 1) {
            filter = orAll[0]
          }
        }
      } catch (e) {
        console.error(e)
      }
    }

    console.log('filter data:', filter)

    const retriever = new AmazonKnowledgeBaseRetriever({
      topK: topK,
      knowledgeBaseId: knowledgeBaseID,
      region: region,
      filter,
      overrideSearchType,
      clientOptions: {
        credentials: {
          accessKeyId: credentialApiKey,
          secretAccessKey: credentialApiSecret,
          sessionToken: credentialApiSession
        }
      }
    })

    return retriever
  }
}

module.exports = { nodeClass: AWSBedrockKBRetriever_Retrievers }
