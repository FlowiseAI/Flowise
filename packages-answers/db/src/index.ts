export * from './client'
import { ChatbotConfig } from 'types/src/index'
declare global {
    namespace PrismaJson {
        // you can use classes, interfaces, types, etc.
        export interface Chatflow {
            id: string
            name: string
            analytic: string
            apikeyid: null
            category: null
            deployed: boolean
            flowData: string
            isPublic: boolean
            apiConfig: null
            createdDate: string
            updatedDate: string
            speechToText: null
            chatbotConfig: ChatbotConfig // This will be typed as a separate interface
        }
    }
}
