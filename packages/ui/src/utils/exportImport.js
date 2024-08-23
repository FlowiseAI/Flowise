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
                func: stringify(tool.func)
            }
        })
    } catch (error) {
        console.error(`exportImport.js sanitizeTool error: ${error}`)
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
        console.error(`exportImport.js sanitizeChatflow error: ${error}`)
    }
}

export const stringify = (object) => {
    try {
        return JSON.stringify(object, null, 2)
    } catch (error) {
        console.error(`exportImport.js stringify error: ${error}`)
    }
}

export const exportData = (exportAllData) => {
    try {
        return { Tool: sanitizeTool(exportAllData.Tool), ChatFlow: sanitizeChatflow(exportAllData.ChatFlow) }
    } catch (error) {
        console.error(`exportImport.js exportData error: ${error}`)
    }
}
