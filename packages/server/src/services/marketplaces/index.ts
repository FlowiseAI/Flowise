import path from 'path'
import * as fs from 'fs'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { IReactFlowEdge, IReactFlowNode, IUser } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { DeleteResult } from 'typeorm'
import { CustomTemplate } from '../../database/entities/CustomTemplate'
import { v4 as uuidv4 } from 'uuid'
import { validate as isUUID } from 'uuid'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { ChatflowVisibility } from '../../database/entities/ChatFlow'

import chatflowsService from '../chatflows'
// import checkOwnership from '../../utils/checkOwnership'
type ITemplate = {
    badge: string
    description: string
    framework: string[]
    usecases: string[]
    nodes: IReactFlowNode[]
    edges: IReactFlowEdge[]
    iconSrc?: string
}

const getCategories = (fileDataObj: ITemplate) => {
    return Array.from(new Set(fileDataObj?.nodes?.map((node) => node.data.category).filter((category) => category)))
}

// Add prefix to file-based template IDs to avoid collisions
const TEMPLATE_TYPE_PREFIXES = {
    CHATFLOW: 'cf_',
    TOOL: 'tool_',
    AGENTFLOW: 'af_',
    ANSWERAI: 'ai_'
}

// Get all templates for marketplaces
const getAllTemplates = async (user: IUser | undefined) => {
    try {
        // let templates: any[] = []

        // // Database templates (keep existing ID as is since they're UUIDs)
        // const appServer = getRunningExpressApp()
        // let chatflows = await appServer.AppDataSource.getRepository(ChatFlow).find()
        // chatflows = chatflows.filter((chatflow) => chatflow.visibility?.includes(ChatflowVisibility.MARKETPLACE))
        // chatflows = chatflows.filter((chatflow) => checkOwnership(chatflow, user))

        // if (chatflows) {
        //     chatflows.forEach((chatflow) => {
        //         const chatbotConfig = JSON.parse(chatflow.chatbotConfig || '{}')
        //         const template = {
        //             id: chatflow.id, // UUID from database
        //             templateName: chatflow.name,
        //             flowData: chatflow.flowData,
        //             badge: chatflow.userId === user?.id ? `SHARED BY ME` : `SHARED BY OTHERS`,
        //             categories: chatflow.category?.includes(';') ? chatflow.category.split(';') : chatflow.category,
        //             type: chatflow.type === 'MULTIAGENT' ? 'Agent Community' : 'Chatflow Community',
        //             description: chatflow.description,
        //             requiresClone: chatbotConfig.requiresClone || false,
        //             isExecutable:
        //                 chatflow.userId === user?.id ||
        //                 (chatflow.visibility?.includes(ChatflowVisibility.ANSWERAI) && chatflow.organizationId === user?.organizationId)
        //         }
        //         templates.push(template)
        //     })
        // }

        // Chatflow templates
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
                description: fileDataObj?.description || '',
                iconSrc: fileDataObj?.iconSrc || '',
                requiresClone: true // All marketplace templates require cloning
            }
            templates.push(template)
        })

        // Tool templates
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
                templateName: file.split('.json')[0],
                requiresClone: true // All marketplace templates require cloning
            }
            templates.push(template)
        })

        // Agentflow templates
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
                categories: fileDataObj?.categories,
                type: 'Agentflow',
                description: fileDataObj?.description || '',
                iconSrc: fileDataObj?.iconSrc || '',
                requiresClone: true // All marketplace templates require cloning
            }
            templates.push(template)
        })
        // marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'answerai')
        // jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
        // jsonsInDir.forEach((file, index) => {
        //     const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'answerai', file)
        //     const fileData = fs.readFileSync(filePath)
        //     const fileDataObj = JSON.parse(fileData.toString())
        //     const template = {
        //         id: `${TEMPLATE_TYPE_PREFIXES.ANSWERAI}${index}`,
        //         categories: fileDataObj?.categories,
        //         type: 'AnswerAI',
        //         templateName: file.split('.json')[0],
        //         description: fileDataObj?.description || '',
        //         iconSrc: fileDataObj?.iconSrc || '',
        //         requiresClone: true // All marketplace templates require cloning
        //     }
        //     templates.push(template)
        // })

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

        // const sortedTemplates = templates.sort((a, b) => a.templateName?.localeCompare(b.templateName))
        const sortedTemplates = templates
        const FlowiseDocsQnAIndex = sortedTemplates.findIndex((tmp) => tmp.templateName === 'Flowise Docs QnA')
        if (FlowiseDocsQnAIndex > 0) {
            sortedTemplates.unshift(sortedTemplates.splice(FlowiseDocsQnAIndex, 1)[0])
        }
        const dbResponse = sortedTemplates
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: marketplacesService.getAllTemplates - ${getErrorMessage(error)}`
        )
    }
}

// Get specific marketplace template
const getMarketplaceTemplate = async (templateIdOrName: string, user?: IUser): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()

        // Remove any template type prefix before checking if it's a UUID
        const cleanId = Object.values(TEMPLATE_TYPE_PREFIXES).reduce((id, prefix) => id.replace(prefix, ''), templateIdOrName)

        let dbResponse = null
        // Check if the input is a valid UUID
        if (isUUID(cleanId)) {
            // Try to find the template in the database
            dbResponse = await appServer.AppDataSource.getRepository(ChatFlow)
                .createQueryBuilder('chatFlow')
                .where('chatFlow.id = :id', { id: cleanId })
                .getOne()
        }

        if (dbResponse) {
            // For unauthenticated users, only allow access to public (Marketplace) chatflows
            if (!user && (!dbResponse.visibility || !dbResponse.visibility.includes(ChatflowVisibility.MARKETPLACE))) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized access to non-public template`)
            }

            // For authenticated users, check permissions
            if (user) {
                const isUserOrgAdmin = user.permissions?.includes('org:manage') && user.organizationId === dbResponse.organizationId
                const isUsersChatflow = dbResponse.userId === user.id
                const isChatflowPublic = dbResponse.isPublic
                const hasChatflowOrgVisibility = dbResponse.visibility?.includes(ChatflowVisibility.ORGANIZATION)
                const isUserInSameOrg = dbResponse.organizationId === user.organizationId

                if (!(isUsersChatflow || isChatflowPublic || isUserOrgAdmin || (hasChatflowOrgVisibility && isUserInSameOrg))) {
                    throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized to access this template`)
                }
            }

            const chatbotConfig = JSON.parse(dbResponse.chatbotConfig || '{}')
            return {
                ...dbResponse,
                requiresClone: chatbotConfig.requiresClone || false, // Get from chatbotConfig
                isExecutable:
                    dbResponse.userId === user?.id ||
                    (dbResponse.visibility?.includes(ChatflowVisibility.ANSWERAI) && dbResponse.organizationId === user?.organizationId),
                isOwner: dbResponse.userId === user?.id
            }
        }

        // If not found in the database, look for it in the file system
        const marketplaceDirs = [
            path.join(__dirname, '..', '..', '..', 'marketplaces', 'chatflows'),
            path.join(__dirname, '..', '..', '..', 'marketplaces', 'tools'),
            path.join(__dirname, '..', '..', '..', 'marketplaces', 'agentflows'),
            path.join(__dirname, '..', '..', '..', 'marketplaces', 'answerai')
        ]

        for (const dir of marketplaceDirs) {
            const files = fs.readdirSync(dir).filter((file) => path.extname(file) === '.json')
            for (const [idx, file] of files.entries()) {
                const prefix =
                    path.basename(dir) === 'agentflows'
                        ? TEMPLATE_TYPE_PREFIXES.AGENTFLOW
                        : path.basename(dir) === 'answerai'
                        ? TEMPLATE_TYPE_PREFIXES.ANSWERAI
                        : path.basename(dir) === 'tools'
                        ? TEMPLATE_TYPE_PREFIXES.TOOL
                        : TEMPLATE_TYPE_PREFIXES.CHATFLOW

                if (`${prefix}${idx}` === templateIdOrName || path.parse(file).name === templateIdOrName) {
                    const filePath = path.join(dir, file)
                    const fileData = fs.readFileSync(filePath, 'utf8')
                    const fileDataObj = JSON.parse(fileData)

                    const result = {
                        id: `${prefix}${idx}`, // Keep ID for reference
                        isPublic: true,
                        name: path.parse(file).name,
                        flowData: fileData,
                        description: fileDataObj.description || '',
                        badge: fileDataObj.badge,
                        usecases: fileDataObj.usecases,
                        framework: fileDataObj.framework,
                        category: fileDataObj.category || '',
                        type:
                            path.basename(dir) === 'agentflows'
                                ? 'Agentflow'
                                : path.basename(dir) === 'answerai'
                                ? 'AnswerAI'
                                : path.basename(dir) === 'tools'
                                ? 'Tool'
                                : 'Chatflow',
                        iconSrc: fileDataObj.iconSrc || '',
                        requiresClone: true,
                        // Add a flag to indicate this is a template
                        isTemplate: true
                    }
                    return result
                }
            }
        }

        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Template ${templateIdOrName} not found`)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: marketplacesService.getMarketplaceTemplate - ${getErrorMessage(error)}`
        )
    }
}

const deleteCustomTemplate = async (templateId: string): Promise<DeleteResult> => {
    try {
        const appServer = getRunningExpressApp()
        return await appServer.AppDataSource.getRepository(CustomTemplate).delete({ id: templateId })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: marketplacesService.deleteCustomTemplate - ${getErrorMessage(error)}`
        )
    }
}

const getAllCustomTemplates = async (user: IUser): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const templates: any[] = await appServer.AppDataSource.getRepository(CustomTemplate).find()
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
        return templates
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
            const chatflow = await chatflowsService.getChatflowById(body.chatflowId)
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
    deleteCustomTemplate,
    getMarketplaceTemplate
}
