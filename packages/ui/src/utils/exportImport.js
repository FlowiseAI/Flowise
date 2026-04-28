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

const sanitizeVariable = (Variable) => {
    try {
        return Variable.map((variable) => {
            return {
                id: variable.id,
                name: variable.name,
                value: variable.value,
                type: variable.type
            }
        })
    } catch (error) {
        throw new Error(`exportImport.sanitizeVariable ${getErrorMessage(error)}`)
    }
}

const sanitizeAssistant = (Assistant) => {
    try {
        return Assistant.map((assistant) => {
            return {
                id: assistant.id,
                details: assistant.details,
                credential: assistant.credential,
                iconSrc: assistant.iconSrc,
                type: assistant.type
            }
        })
    } catch (error) {
        throw new Error(`exportImport.sanitizeAssistant ${getErrorMessage(error)}`)
    }
}

const sanitizeCustomTemplate = (CustomTemplate) => {
    try {
        return CustomTemplate.map((customTemplate) => {
            return { ...customTemplate, usecases: JSON.stringify(customTemplate.usecases), workspaceId: undefined }
        })
    } catch (error) {
        throw new Error(`exportImport.sanitizeCustomTemplate ${getErrorMessage(error)}`)
    }
}

const sanitizeDocumentStore = (DocumentStore) => {
    try {
        return DocumentStore.map((documentStore) => {
            return { ...documentStore, workspaceId: undefined }
        })
    } catch (error) {
        throw new Error(`exportImport.sanitizeDocumentStore ${getErrorMessage(error)}`)
    }
}

const sanitizeExecution = (Execution) => {
    try {
        return Execution.map((execution) => {
            if (execution.agentflow) execution.agentflow.workspaceId = undefined
            return { ...execution, workspaceId: undefined }
        })
    } catch (error) {
        throw new Error(`exportImport.sanitizeExecution ${getErrorMessage(error)}`)
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
        return {
            AgentFlow: sanitizeChatflow(exportAllData.AgentFlow),
            AgentFlowV2: sanitizeChatflow(exportAllData.AgentFlowV2),
            AssistantFlow: sanitizeChatflow(exportAllData.AssistantFlow),
            AssistantCustom: sanitizeAssistant(exportAllData.AssistantCustom),
            AssistantOpenAI: sanitizeAssistant(exportAllData.AssistantOpenAI),
            AssistantAzure: sanitizeAssistant(exportAllData.AssistantAzure),
            ChatFlow: sanitizeChatflow(exportAllData.ChatFlow),
            ChatMessage: exportAllData.ChatMessage,
            ChatMessageFeedback: exportAllData.ChatMessageFeedback,
            CustomTemplate: sanitizeCustomTemplate(exportAllData.CustomTemplate),
            DocumentStore: sanitizeDocumentStore(exportAllData.DocumentStore),
            DocumentStoreFileChunk: exportAllData.DocumentStoreFileChunk,
            Execution: sanitizeExecution(exportAllData.Execution),
            Tool: sanitizeTool(exportAllData.Tool),
            Variable: sanitizeVariable(exportAllData.Variable)
        }
    } catch (error) {
        throw new Error(`exportImport.exportData ${getErrorMessage(error)}`)
    }
}
