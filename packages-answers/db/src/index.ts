export * from './client'

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
        export interface ChatbotConfig {
            botMessage: MessageConfig
            userMessage: MessageConfig
            textInput: TextInputConfig
            overrideConfig: Record<string, unknown>
            title: string
            welcomeMessage: string
            backgroundColor: string
            fontSize: number
            poweredByTextColor: string
            starterPrompts: Array<StarterPrompt>
        }

        export interface FlowData {
            nodes: Node[]
            edges: Edge[]
            viewport: Viewport
        }

        export interface Node {
            id: string
            position: Position
            type: string
            data: NodeData
            width: number
            height: number
            selected: boolean
            dragging: boolean
            positionAbsolute: Position
        }

        export interface Position {
            x: number
            y: number
        }

        export interface NodeData {
            id: string
            label: string
            version: number
            name: string
            type: string
            baseClasses: string[]
            category: string
            description: string
            inputParams: InputParam[]
            inputAnchors: InputAnchor[]
            inputs: Inputs
            outputAnchors: OutputAnchor[]
            outputs: Record<string, unknown>
            selected: boolean
            credential?: string
        }

        export interface InputParam {
            label: string
            name: string
            type: string
            optional?: boolean
            id: string
            description?: string
            warning?: string
            rows?: number
            additionalParams?: boolean
            default?: string
            credentialNames?: string[]
            options?: Option[]
            step?: number
            placeholder?: string
        }

        export interface InputAnchor {
            label: string
            name: string
            type: string
            id: string
            optional?: boolean
            description?: string
            list?: boolean
        }

        export interface Inputs {
            model?: string
            vectorStoreRetriever?: string
            memory?: string
            returnSourceDocuments?: boolean
            rephrasePrompt?: string
            responsePrompt?: string
            cache?: string
            modelName?: string
            temperature?: number
            maxTokens?: string
            topP?: string
            frequencyPenalty?: string
            presencePenalty?: string
            timeout?: string
            basepath?: string
            baseOptions?: string
            document?: string[]
            embeddings?: string
            pineconeIndex?: string
            pineconeNamespace?: string
            pineconeMetadataFilter?: string
            topK?: string
            searchType?: string
            fetchK?: string
            lambda?: string
            chunkSize?: string
            chunkOverlap?: string
            separators?: string
            textSplitter?: string
            configUtility?: string
            contentType?: string
            environmentId?: string
            include?: string
            includeAll?: string
            limit?: string
            metadata?: string
        }

        export interface OutputAnchor {
            id: string
            name: string
            label: string
            description: string
            type: string
        }

        export interface Edge {
            source: string
            sourceHandle: string
            target: string
            targetHandle: string
            type: string
            id: string
        }

        export interface Viewport {
            x: number
            y: number
            zoom: number
        }

        export interface Option {
            label: string
            name: string
        }

        export interface StarterPrompt {
            prompt: string
        }
        export interface MessageConfig {
            showAvatar: boolean
            backgroundColor: string
            textColor: string
        }

        export interface TextInputConfig {
            backgroundColor: string
            textColor: string
            placeholder: string
            sendButtonColor: string
        }
    }
}
