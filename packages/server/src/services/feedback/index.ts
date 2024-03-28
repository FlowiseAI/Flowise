import { utilGetChatMessageFeedback } from '../../utils/getChatMessageFeedback'
import { utilAddChatMessageFeedback } from '../../utils/addChatMessageFeedback'
import { utilUpdateChatMessageFeedback } from '../../utils/updateChatMessageFeedback'
import { IChatMessageFeedback } from '../../Interface'

// Get all chatmessage feedback from chatflowid
const getAllChatMessageFeedback = async (
    chatflowid: string,
    chatId: string | undefined,
    sortOrder: string | undefined,
    startDate: string | undefined,
    endDate: string | undefined
) => {
    try {
        const dbResponse = await utilGetChatMessageFeedback(chatflowid, chatId, sortOrder, startDate, endDate)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: feedbackService.getAllChatMessageFeedback - ${error}`)
    }
}

// Add chatmessage feedback for chatflowid
const createChatMessageFeedbackForChatflow = async (requestBody: Partial<IChatMessageFeedback>): Promise<any> => {
    try {
        const dbResponse = await utilAddChatMessageFeedback(requestBody)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: feedbackService.createChatMessageFeedbackForChatflow - ${error}`)
    }
}

// Add chatmessage feedback for chatflowid
const updateChatMessageFeedbackForChatflow = async (chatflowId: string, requestBody: Partial<IChatMessageFeedback>): Promise<any> => {
    try {
        const dbResponse = await utilUpdateChatMessageFeedback(chatflowId, requestBody)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: feedbackService.updateChatMessageFeedbackForChatflow - ${error}`)
    }
}

export default {
    getAllChatMessageFeedback,
    createChatMessageFeedbackForChatflow,
    updateChatMessageFeedbackForChatflow
}
