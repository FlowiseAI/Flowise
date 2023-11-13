import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOutputsValue, PromptTemplate, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { DataSource } from 'typeorm'
import { NodeVM } from 'vm2'

class CustomTool_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Function Tool'
        this.name = 'functionTool'
        this.version = 1.0
        this.type = 'FunctionTool'
        this.icon = 'function.png'
        this.category = 'Tools'
        this.description = `Use custom tool you've created in Flowise within chatflow`
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(PromptTemplate)]
        this.inputs = [
            {
                label: 'Function Name',
                name: 'functionName',
                type: 'string'
            },
            {
                label: 'Function Description',
                name: 'functionDescription',
                type: 'string'
            },
            {
                label: 'Input Values',
                name: 'inputValues',
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true
            },
            {
                label: 'Function Code',
                name: 'functionCode',
                type: 'string',
                rows: 5
            }
        ]
        this.outputs = [
            {
                label: 'Function Output',
                name: 'functionOutput',
                baseClasses: ['json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const functionName = nodeData.inputs?.functionName as string
        const functionCode = nodeData.inputs?.functionCode as string
        const functionDescription = nodeData.inputs?.functionDescription as string
        const input = nodeData.inputs?.inputValues as object

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const availableDependencies = [
            '@dqbd/tiktoken',
            '@getzep/zep-js',
            '@huggingface/inference',
            '@pinecone-database/pinecone',
            '@supabase/supabase-js',
            'axios',
            'cheerio',
            'chromadb',
            'cohere-ai',
            'd3-dsv',
            'form-data',
            'graphql',
            'html-to-text',
            'langchain',
            'linkifyjs',
            'mammoth',
            'moment',
            'node-fetch',
            'pdf-parse',
            'pdfjs-dist',
            'playwright',
            'puppeteer',
            'srt-parser-2',
            'typeorm',
            'weaviate-ts-client'
        ]

        try {
            //let jsonInput = JSON.parse(input)
            let arg: any = {
                name: functionName,
                description: functionDescription,
                //schema: z.object(convertSchemaToZod("[{\"id\":1,\"property\":\"query\",\"description\":\"\",\"type\":\"string\",\"required\":true}]")),
                code: functionCode,
                data: input
            }
            //let dst = new DynamicStructuredTool(obj)

            let sandbox: any = {}
            if (typeof arg === 'object' && Object.keys(arg).length) {
                for (const item in arg) {
                    sandbox[`$${item}`] = arg[item]
                }
            }

            const defaultAllowBuiltInDep = [
                'assert',
                'buffer',
                'crypto',
                'events',
                'http',
                'https',
                'net',
                'path',
                'querystring',
                'timers',
                'tls',
                'url',
                'zlib'
            ]

            const builtinDeps = process.env.TOOL_FUNCTION_BUILTIN_DEP
                ? defaultAllowBuiltInDep.concat(process.env.TOOL_FUNCTION_BUILTIN_DEP.split(','))
                : defaultAllowBuiltInDep
            const externalDeps = process.env.TOOL_FUNCTION_EXTERNAL_DEP ? process.env.TOOL_FUNCTION_EXTERNAL_DEP.split(',') : []
            const deps = availableDependencies.concat(externalDeps)

            const options = {
                console: 'inherit',
                sandbox,
                require: {
                    external: { modules: deps },
                    builtin: builtinDeps
                }
            } as any

            const vm = new NodeVM(options)
            const response = await vm.run(`module.exports = async function() {let data =${arg.data}; ${functionCode}}()`, __dirname)
            return response
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: CustomTool_Tools }
