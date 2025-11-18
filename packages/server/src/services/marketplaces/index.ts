import * as fs from 'fs'
import { StatusCodes } from 'http-status-codes'
import path from 'path'
import { DeleteResult } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { CustomTemplate } from '../../database/entities/CustomTemplate'
import { WorkspaceService } from '../../enterprise/services/workspace.service'
import { getWorkspaceSearchOptions } from '../../enterprise/utils/ControllerServiceUtils'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { IReactFlowEdge, IReactFlowNode } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import chatflowsService from '../chatflows'

type ITemplate = {
    badge: string
    description: string
    framework: string[]
    usecases: string[]
    nodes: IReactFlowNode[]
    edges: IReactFlowEdge[]
}

const getCategories = (fileDataObj: ITemplate) => {
    return Array.from(new Set(fileDataObj?.nodes?.map((node) => node.data.category).filter((category) => category)))
}

// Get all templates for marketplaces
const getAllTemplates = async () => {
    try {
        let marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'chatflows')
        let jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
        let templates: any[] = []
        jsonsInDir.forEach((file) => {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'chatflows', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString()) as ITemplate

            const template = {
                id: uuidv4(),
                templateName: file.split('.json')[0],
                flowData: fileData.toString(),
                badge: fileDataObj?.badge,
                framework: fileDataObj?.framework,
                usecases: fileDataObj?.usecases,
                categories: getCategories(fileDataObj),
                type: 'Chatflow',
                description: fileDataObj?.description || ''
            }
            templates.push(template)
        })

        marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'tools')
        jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
        jsonsInDir.forEach((file) => {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'tools', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString())
            const template = {
                ...fileDataObj,
                id: uuidv4(),
                type: 'Tool',
                framework: fileDataObj?.framework,
                badge: fileDataObj?.badge,
                usecases: fileDataObj?.usecases,
                categories: [],
                templateName: file.split('.json')[0]
            }
            templates.push(template)
        })

        /*
        * Agentflow is deprecated
        marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'agentflows')
        jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
        jsonsInDir.forEach((file) => {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'agentflows', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString())
            const template = {
                id: uuidv4(),
                templateName: file.split('.json')[0],
                flowData: fileData.toString(),
                badge: fileDataObj?.badge,
                framework: fileDataObj?.framework,
                usecases: fileDataObj?.usecases,
                categories: getCategories(fileDataObj),
                type: 'Agentflow',
                description: fileDataObj?.description || ''
            }
            templates.push(template)
        })*/

        marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'agentflowsv2')
        jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
        jsonsInDir.forEach((file) => {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'agentflowsv2', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString())
            const template = {
                id: uuidv4(),
                templateName: file.split('.json')[0],
                flowData: fileData.toString(),
                badge: fileDataObj?.badge,
                framework: fileDataObj?.framework,
                usecases: fileDataObj?.usecases,
                categories: getCategories(fileDataObj),
                type: 'AgentflowV2',
                description: fileDataObj?.description || ''
            }
            templates.push(template)
        })
        const sortedTemplates = templates.sort((a, b) => {
            // Prioritize AgentflowV2 templates first
            if (a.type === 'AgentflowV2' && b.type !== 'AgentflowV2') {
                return -1
            }
            if (b.type === 'AgentflowV2' && a.type !== 'AgentflowV2') {
                return 1
            }
            // Put Tool templates last
            if (a.type === 'Tool' && b.type !== 'Tool') {
                return 1
            }
            if (b.type === 'Tool' && a.type !== 'Tool') {
                return -1
            }
            // For same types, sort alphabetically by templateName
            return a.templateName.localeCompare(b.templateName)
        })
        const dbResponse = sortedTemplates
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: marketplacesService.getAllTemplates - ${getErrorMessage(error)}`
        )
    }
}

const deleteCustomTemplate = async (templateId: string, workspaceId: string): Promise<DeleteResult> => {
    try {
        const appServer = getRunningExpressApp()
        return await appServer.AppDataSource.getRepository(CustomTemplate).delete({ id: templateId, workspaceId: workspaceId })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: marketplacesService.deleteCustomTemplate - ${getErrorMessage(error)}`
        )
    }
}

const _modifyTemplates = (templates: any[]) => {
    templates.map((template) => {
        template.usecases = template.usecases ? JSON.parse(template.usecases) : ''
        if (template.type === 'Tool') {
            template.flowData = JSON.parse(template.flowData)
            template.iconSrc = template.flowData.iconSrc
            template.schema = template.flowData.schema
            template.func = template.flowData.func
            template.categories = []
            template.flowData = undefined
        } else {
            template.categories = getCategories(JSON.parse(template.flowData))
        }
        if (!template.badge) {
            template.badge = ''
        }
        if (!template.framework) {
            template.framework = ''
        }
    })
}

const getAllCustomTemplates = async (workspaceId?: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const templates: any[] = await appServer.AppDataSource.getRepository(CustomTemplate).findBy(getWorkspaceSearchOptions(workspaceId))
        const dbResponse = []
        _modifyTemplates(templates)
        dbResponse.push(...templates)
        // get shared credentials
        if (workspaceId) {
            const workspaceService = new WorkspaceService()
            const sharedItems = (await workspaceService.getSharedItemsForWorkspace(workspaceId, 'custom_template')) as CustomTemplate[]
            if (sharedItems && sharedItems.length) {
                _modifyTemplates(sharedItems)
                // add shared = true flag to all shared items, to differentiate them in the UI
                sharedItems.forEach((sharedItem) => {
                    // @ts-ignore
                    sharedItem.shared = true
                    dbResponse.push(sharedItem)
                })
            }
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: marketplacesService.getAllCustomTemplates - ${getErrorMessage(error)}`
        )
    }
}

const saveCustomTemplate = async (body: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        let flowDataStr = ''
        let derivedFramework = ''
        const customTemplate = new CustomTemplate()
        Object.assign(customTemplate, body)

        if (body.chatflowId) {
            const chatflow = await chatflowsService.getChatflowById(body.chatflowId, body.workspaceId)
            const flowData = JSON.parse(chatflow.flowData)
            const { framework, exportJson } = _generateExportFlowData(flowData)
            flowDataStr = JSON.stringify(exportJson)
            customTemplate.framework = framework
        } else if (body.tool) {
            const flowData = {
                iconSrc: body.tool.iconSrc,
                schema: body.tool.schema,
                func: body.tool.func
            }
            customTemplate.framework = ''
            customTemplate.type = 'Tool'
            flowDataStr = JSON.stringify(flowData)
        }
        customTemplate.framework = derivedFramework
        if (customTemplate.usecases) {
            customTemplate.usecases = JSON.stringify(customTemplate.usecases)
        }
        const entity = appServer.AppDataSource.getRepository(CustomTemplate).create(customTemplate)
        entity.flowData = flowDataStr
        const flowTemplate = await appServer.AppDataSource.getRepository(CustomTemplate).save(entity)
        return flowTemplate
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: marketplacesService.saveCustomTemplate - ${getErrorMessage(error)}`
        )
    }
}

const _generateExportFlowData = (flowData: any) => {
    const nodes = flowData.nodes
    const edges = flowData.edges

    let framework = 'Langchain'
    for (let i = 0; i < nodes.length; i += 1) {
        nodes[i].selected = false
        const node = nodes[i]

        const newNodeData = {
            id: node.data.id,
            label: node.data.label,
            version: node.data.version,
            name: node.data.name,
            type: node.data.type,
            color: node.data.color,
            hideOutput: node.data.hideOutput,
            hideInput: node.data.hideInput,
            baseClasses: node.data.baseClasses,
            tags: node.data.tags,
            category: node.data.category,
            description: node.data.description,
            inputParams: node.data.inputParams,
            inputAnchors: node.data.inputAnchors,
            inputs: {},
            outputAnchors: node.data.outputAnchors,
            outputs: node.data.outputs,
            selected: false
        }

        if (node.data.tags && node.data.tags.length) {
            if (node.data.tags.includes('LlamaIndex')) {
                framework = 'LlamaIndex'
            }
        }

        // Remove password, file & folder
        if (node.data.inputs && Object.keys(node.data.inputs).length) {
            const nodeDataInputs: any = {}
            for (const input in node.data.inputs) {
                const inputParam = node.data.inputParams.find((inp: any) => inp.name === input)
                if (inputParam && inputParam.type === 'password') continue
                if (inputParam && inputParam.type === 'file') continue
                if (inputParam && inputParam.type === 'folder') continue
                nodeDataInputs[input] = node.data.inputs[input]
            }
            newNodeData.inputs = nodeDataInputs
        }

        nodes[i].data = newNodeData
    }
    const exportJson = {
        nodes,
        edges
    }
    return { exportJson, framework }
}

export default {
    getAllTemplates,
    getAllCustomTemplates,
    saveCustomTemplate,
    deleteCustomTemplate
}
