import { getErrorMessage } from './errorHandler'
import { generateExportFlowData } from './genericHelper'

const sanitizeTool = (Tool) => {
    try {
        return Tool.map((tool) => {
            return {
                id: tool.id,
                name: tool.name,
                description: tool.description,
                color: tool.color,
                iconSrc: tool.iconSrc,
                schema: tool.schema,
                func: tool.func
            }
        })
    } catch (error) {
        throw new Error(`exportImport.sanitizeTool ${getErrorMessage(error)}`)
    }
}

const sanitizeChatflow = (ChatFlow) => {
    try {
        return ChatFlow.map((chatFlow) => {
            const sanitizeFlowData = generateExportFlowData(JSON.parse(chatFlow.flowData))
            return {
                id: chatFlow.id,
                name: chatFlow.name,
                flowData: stringify(sanitizeFlowData),
                type: chatFlow.type
            }
        })
    } catch (error) {
        throw new Error(`exportImport.sanitizeChatflow ${getErrorMessage(error)}`)
    }
}

export const stringify = (object) => {
    try {
        return JSON.stringify(object, null, 2)
    } catch (error) {
        throw new Error(`exportImport.stringify ${getErrorMessage(error)}`)
    }
}

export const exportData = (exportAllData) => {
    try {
        return { Tool: sanitizeTool(exportAllData.Tool), ChatFlow: sanitizeChatflow(exportAllData.ChatFlow) }
    } catch (error) {
        throw new Error(`exportImport.exportData ${getErrorMessage(error)}`)
    }
}
