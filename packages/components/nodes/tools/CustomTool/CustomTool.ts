import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { convertSchemaToZod, getBaseClasses, getVars } from '../../../src/utils'
import { DynamicStructuredTool } from './core'
import { z } from 'zod'
import { DataSource } from 'typeorm'

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

    constructor() {
        this.label = 'Custom Tool'
        this.name = 'customTool'
        this.version = 1.0
        this.type = 'CustomTool'
        this.icon = 'customtool.svg'
        this.category = 'Tools'
        this.description = `Use custom tool you've created in Flowise within chatflow`
        this.inputs = [
            {
                label: 'Select Tool',
                name: 'selectedTool',
                type: 'asyncOptions',
                loadMethod: 'listTools'
            }
        ]
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(DynamicStructuredTool)]
    }

    //@ts-ignore
    loadMethods = {
        async listTools(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity

            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }

            const tools = await appDataSource.getRepository(databaseEntities['Tool']).find()

            for (let i = 0; i < tools.length; i += 1) {
                const data = {
                    label: tools[i].name,
                    name: tools[i].id,
                    description: tools[i].description
                } as INodeOptionsValue
                returnData.push(data)
            }
            return returnData
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const selectedToolId = nodeData.inputs?.selectedTool as string
        const customToolFunc = nodeData.inputs?.customToolFunc as string
        const customToolName = nodeData.inputs?.customToolName as string
        const customToolDesc = nodeData.inputs?.customToolDesc as string
        const customToolSchema = nodeData.inputs?.customToolSchema as string

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity

        try {
            const tool = await appDataSource.getRepository(databaseEntities['Tool']).findOneBy({
                id: selectedToolId
            })

            if (!tool) throw new Error(`Tool ${selectedToolId} not found`)
            const obj = {
                name: tool.name,
                description: tool.description,
                schema: z.object(convertSchemaToZod(tool.schema)),
                code: tool.func
            }
            if (customToolFunc) obj.code = customToolFunc
            if (customToolName) obj.name = customToolName
            if (customToolDesc) obj.description = customToolDesc
            if (customToolSchema) {
                const zodSchemaFunction = new Function('z', `return ${customToolSchema}`)
                obj.schema = zodSchemaFunction(z)
            }

            const variables = await getVars(appDataSource, databaseEntities, nodeData)

            const flow = { chatflowId: options.chatflowid }

            let dynamicStructuredTool = new DynamicStructuredTool(obj)
            dynamicStructuredTool.setVariables(variables)
            dynamicStructuredTool.setFlowObject(flow)

            return dynamicStructuredTool
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: CustomTool_Tools }
