import path from 'path'
import * as fs from 'fs'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ChatFlow, ChatflowVisibility } from '../../database/entities/ChatFlow'
import checkOwnership from '../../utils/checkOwnership'
import { In, Any } from 'typeorm'

// Get all templates for marketplaces
const getAllTemplates = async (userId?: string, organizationId?: string) => {
    try {
        // TODO: Pull from all chatflows and tools in the database that have visibility Marketplace
        let marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'chatflows')
        let jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')

        let templates: any[] = []

        const appServer = getRunningExpressApp()
        //**
        let chatflows = await appServer.AppDataSource.getRepository(ChatFlow).find({
            // TODO: Figure out why this wher condition doesn't work
            // where: { visibility: Any(['Marketplace']) }
        })

        chatflows = chatflows.filter((chatflow) => chatflow.visibility?.includes(ChatflowVisibility.MARKETPLACE))
        chatflows = chatflows.filter((chatflow) => checkOwnership(chatflow, userId, organizationId))

        if (!chatflows) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflows not found`)
        }
        chatflows.forEach((chatflow) => {
            const template = {
                id: chatflow.id,
                templateName: chatflow.name,
                flowData: chatflow.flowData,
                badge: chatflow.userId === userId ? `SHARED BY ME` : `SHARED BY OTHERS`,
                // framework: `chatflow.framework`,
                // categories: `chatflow.categories`,
                type: chatflow.type
                // description: `chatflow.description`
            }
            templates.push(template)
        })

        jsonsInDir.forEach((file, index) => {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'chatflows', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString())
            const template = {
                id: index,
                templateName: file.split('.json')[0],
                flowData: fileData.toString(),
                badge: fileDataObj?.badge,
                framework: fileDataObj?.framework,
                categories: fileDataObj?.categories,
                type: 'Chatflow',
                description: fileDataObj?.description || '',
                iconSrc: fileDataObj?.iconSrc || ''
            }
            templates.push(template)
        })

        marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'tools')
        jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
        jsonsInDir.forEach((file, index) => {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'tools', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString())
            const template = {
                ...fileDataObj,
                id: index,
                type: 'Tool',
                framework: fileDataObj?.framework,
                badge: fileDataObj?.badge,
                categories: '',
                templateName: file.split('.json')[0]
            }
            templates.push(template)
        })

        marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'agentflows')
        jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
        jsonsInDir.forEach((file, index) => {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'agentflows', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString())
            const template = {
                id: index,
                templateName: file.split('.json')[0],
                flowData: fileData.toString(),
                badge: fileDataObj?.badge,
                framework: fileDataObj?.framework,
                categories: fileDataObj?.categories,
                type: 'Agentflow',
                description: fileDataObj?.description || '',
                iconSrc: fileDataObj?.iconSrc || ''
            }
            templates.push(template)
        })

        marketplaceDir = path.join(__dirname, '..', '..', '..', 'marketplaces', 'answerai')
        jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
        jsonsInDir.forEach((file, index) => {
            const filePath = path.join(__dirname, '..', '..', '..', 'marketplaces', 'answerai', file)
            const fileData = fs.readFileSync(filePath)
            const fileDataObj = JSON.parse(fileData.toString())
            const template = {
                id: index,
                templateName: file.split('.json')[0],
                flowData: fileData.toString(),
                badge: fileDataObj?.badge,
                framework: fileDataObj?.framework,
                categories: fileDataObj?.categories,
                type: 'AnswerAI',
                description: fileDataObj?.description || '',
                iconSrc: fileDataObj?.iconSrc || ''
            }
            templates.push(template)
        })
        const sortedTemplates = templates.sort((a, b) => a.templateName.localeCompare(b.templateName))
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

export default {
    getAllTemplates
}
