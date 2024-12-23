import { getBaseClasses, getCredentialData } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { Neo4jGraph } from '@langchain/community/graphs/neo4j_graph'

class Neo4j_Graphs implements INode {
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
        this.label = 'Neo4j'
        this.name = 'Neo4j'
        this.version = 1.0
        this.type = 'Neo4j'
        this.icon = 'neo4j.svg'
        this.category = 'Graph'
        this.description = 'Connect with Neo4j graph database'
        this.baseClasses = [this.type, ...getBaseClasses(Neo4jGraph)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['neo4jApi']
        }
        this.inputs = [
            {
                label: 'Database',
                name: 'database',
                type: 'string',
                placeholder: 'neo4j',
                optional: true
            },
            {
                label: 'Timeout (ms)',
                name: 'timeoutMs',
                type: 'number',
                default: 5000,
                optional: true
            },
            {
                label: 'Enhanced Schema',
                name: 'enhancedSchema',
                type: 'boolean',
                default: false,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const database = nodeData.inputs?.database as string
        const timeoutMs = nodeData.inputs?.timeoutMs as number
        const enhancedSchema = nodeData.inputs?.enhancedSchema as boolean
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)

        const neo4jConfig = {
            url: credentialData?.url,
            username: credentialData?.username,
            password: credentialData?.password
        }

        const neo4jGraph = await Neo4jGraph.initialize({
            ...neo4jConfig,
            ...(database && { database }),
            ...(timeoutMs && { timeoutMs }),
            ...(enhancedSchema && { enhancedSchema })
        })

        return neo4jGraph
    }
}

module.exports = { nodeClass: Neo4j_Graphs }
