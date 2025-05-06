import * as DB from 'db/generated/prisma-client'
import { Hit } from '@algolia/client-search'

export interface AnswersConfig {}

export interface Document extends DB.Document {
    pageContent: string
    metadata: any
}
export interface Sidekick extends DB.Sidekick {
    constraints: {
        isSpeechToTextEnabled: boolean
        isImageUploadAllowed: boolean
        uploadSizeAndTypes: {
            fileTypes: string[]
            maxUploadSize: number
        }[]
    }
    favoritedBy?: Array<User>
    sharedWith?: string
    categories?: string[]
}
export type PineconeObject = {
    vectors: PineconeVector[]
}

export interface MessageFeedback extends DB.MessageFeedback {}

export type PineconeVector = {
    text: string
    metadata: any
    uid: string
}
export type RecommendedPrompt = {
    id: string
    title?: string
    content: string
    actor?: string
    likes?: number
    views?: number
}
export interface AppService {
    id: string
    name: string
    description?: string
    providerId?: string
    enabled?: boolean
    imageURL?: string
}
export interface ConfluenceSettings {
    enabled: boolean
    accessToken?: string
    spaces?: ConfluenceSpaceSetting[]
    pages?: {
        key: string
        enabled: boolean
    }[]
}
export interface AppSettings {
    services?: AppService[]
    jira?: {
        projects?: {
            key: string
            enabled: boolean
        }[]
    }
    confluence?: ConfluenceSettings
    slack?: {
        channels?: SlackChannelSetting[]
    }
    web?: {
        urls?: WebSetting[]
        domains?: WebSetting[]
    }
    algolia?: {
        index?: string[]
        preview?: boolean
    }
    openapi?: {
        urls?: OpenApiSetting[]
    }
    airtable?: {
        tables?: {
            id: string
            title: string
            enabled: boolean
        }[]
    }
    codebase?: {
        repos?: {
            id: string
            name: string
            enabled: boolean
        }[]
    }
    document?: {
        url?: {
            id: string
            title: string
            enabled: boolean
        }[]
    }
    files?: {
        url?: {
            id: string
            fileId: string
            enabled: boolean
        }[]
    }
    zoom?: {
        meetings?: {
            id: string
            name: string
            enabled: boolean
        }[]
    }
    youtube?: {
        video?: {
            id: string
            name: string
            enabled: boolean
        }[]
    }
    models?: Models
    filters?: AnswersFilters
    chatflowDomain?: string // This should be required
}

export interface JiraFilters {
    project?: string[]
    account?: string[]
    assignee?: string[]
    priority?: string[]
    status_category?: string[]
}
export interface SlackFilters {
    channelId?: string[]
}

export interface WebUrlType extends Document {
    inputValue?: string
    entireDomain?: boolean
}

export interface AlgoliaFilters {
    index?: string[]
    preview?: string[]
}

export interface OpenApiFilters {}

export interface ConfluenceFilters {
    spaceId?: string[]
    spaces?: ConfluenceSpaceSetting[]
}

export interface UserFilters {}

export interface AirtableFilters {
    table?: string[]
    view?: string[]
}

export interface SourceFilters {
    [key: string]: SourceFilterValue
}

export interface DocumentFilter {
    documentId?: string
    label: string
    filter: Record<string, string>
}

export interface SourceFilterValue {
    sources: DocumentFilter[]
}
export interface CodebaseFilters {
    repo?: SourceFilterValue
}

export interface WebFilters {
    url?: SourceFilterValue
    domain?: SourceFilterValue
}

export interface StandardDocumentUrlFilters {
    url?: SourceFilterValue
}

export interface StandardDocumentDataSourcesFilters {
    document?: StandardDocumentUrlFilters
    zoom?: StandardDocumentUrlFilters
    youtube?: StandardDocumentUrlFilters
    file?: StandardDocumentUrlFilters
}

export interface FilterDatasources extends StandardDocumentDataSourcesFilters {
    user?: UserFilters
    jira?: JiraFilters
    slack?: SlackFilters
    web?: WebFilters
    openapi?: OpenApiFilters
    confluence?: ConfluenceFilters
    airtable?: AirtableFilters
    codebase?: CodebaseFilters
}
export interface AnswersFilters {
    models?: {
        [key: string]: string[]
    }
    datasources?: FilterDatasources
}

export interface Task {
    id: string
    title: string
    description: string
    sidekicks: DB.Sidekick[]
    filters: AnswersFilters
    completed: boolean
    dueDate: string
    createdAt: string
    updatedAt: string
    completedAt: string
}

type Models = {
    jira: string[]
    slack: string[]
    web: string[]
    algolia: string[]
    openapi: string[]
    airtable: string[]
    codebase: string[]
    document: string[]
    file: string[]
    zoom: string[]
    youtube: string[]
    [key: string]: string[]
}

type FeatureFlag = {
    enabled?: boolean
}

export type Flags = {
    [key: string]: FeatureFlag
}

export interface Organization extends Omit<DB.Organization, 'appSettings'> {
    appSettings: AppSettings
    contextFields?: ContextField[]
}

export interface User extends Omit<DB.User, 'appSettings'> {
    appSettings: AppSettings
    currentOrganization?: Organization
    contextFields?: ContextField[]
    chatflowDomain: string
    answersDomain: string
    org_id: string
    org_name: string
    roles?: string[]
    // accounts: DB.Account[] | null;
}

export interface Plan extends DB.Plan {}
export interface ActiveUserPlan extends DB.ActiveUserPlan {
    plan: Plan
}

export interface ContextField extends DB.ContextField {}

export interface ChatApp extends Omit<DB.ChatApp, 'appSettings'> {
    appSettings: AppSettings
}

export interface Prompt extends DB.Prompt {
    content: string
}
export interface Chat extends Omit<DB.Chat, 'filters'> {
    journey?: Journey | null
    filters?: AnswersFilters
    prompt?: Prompt | null
    messages?: Message[] | null
    users?: User[] | null
}

export interface Journey extends Omit<DB.Journey, 'filters'> {
    chats: Chat[] | null
    appSettings: AppSettings
    filters: AnswersFilters
    completed: boolean
    tasks: Task[] | null
}

export type SlackChannel = { id: string; name: string }
export interface SlackChannelSetting extends SlackChannel {
    enabled: boolean
}
export type SlackMessage = {}

export type ConfluenceSpace = {
    key: string
    id: string
    name: string
    type: string
    status: string
    expand: string
    _links: {
        self: string
    }
}
export interface ConfluenceSpaceSetting extends ConfluenceSpace {
    enabled?: boolean
}

export interface Message extends Partial<DB.Message> {
    chat?: Chat | null
    user?: User | null
    role: string
    feedbacks?: MessageFeedback[]
    content: string
}

export type AlgoliaHit = Hit<{
    path: string
    title: string
    contentBody: string
    summary: string
    locale: string
    url?: string
    domain?: string
}>
export interface AlgoliaSetting extends AlgoliaHit {
    enabled: boolean
}

export type WebPage = {
    url: string
    content: string
    domain: string
    title?: string
    description?: string
}
export interface WebSetting extends WebPage {
    enabled: boolean
}

export type OpenApi = {
    paths: string[]
    info: {
        title: string
        version: string
    }
}

export interface OpenApiSetting extends OpenApi {
    enabled: boolean
}

export interface AirtableSetting extends AirtableRecord {
    enabled: boolean
}

export interface CodebaseSetting extends CodebaseRecord {
    enabled: boolean
}

export interface FilesSetting extends FileRecord {
    enabled: boolean
}

export interface DocumentSetting extends DocumentRecord {
    enabled: boolean
}

export interface ZoomSetting extends ZoomRecord {
    enabled: boolean
}

export interface YoutubeSetting extends YoutubeRecord {
    enabled: boolean
}

export interface OpenApiProvider {
    added: string
    preferred: string
    versions: {
        [version: string]: {
            added: string
            info: {
                contact?: {
                    email?: string
                    name?: string
                    url?: string
                    'x-twitter'?: string
                }
                description?: string
                license?: {
                    name?: string
                    url?: string
                }
                termsOfService?: string
                title?: string
                version?: string
                'x-apisguru-categories'?: string[]
                'x-logo'?: {
                    url?: string
                    backgroundColor?: string
                }
                'x-origin'?: {
                    format?: string
                    url?: string
                    version?: string
                }[]
                'x-providerName'?: string
                'x-serviceName'?: string
                [key: string]: any
            }
            updated: string
            swaggerUrl?: string
            swaggerYamlUrl?: string
            openapiVer?: string
            externalDocs?: {
                description?: string
                url?: string
                [key: string]: any
            }
            [key: string]: any
        }
    }
}

export type ConfluencePage = {
    id: number
    status: string
    title: string
    spaceId: number
    parentId: number
    authorId: string
    createdAt: string
    version: {
        createdAt: string
        message: string
        number: number
        minorEdit: boolean
        authorId: string
    }
    content: string
    body: {
        storage?: {
            representation: string
            value: string
        }
        atlas_doc_format?: {
            representation: string
            value: string
        }
    }
}

export type AirtableRecord = {
    id: number
    title: string
    fields: {
        [key: string]: string
    }
}

export type CodebaseRecord = {
    id: number
    title: string
}

export type DocumentRecord = {
    title: string
    url: string
    content: string
}

export type FileRecord = {
    content: string
    fileId: string
    title?: string
}

export type ZoomRecord = {
    id: number
    title: string
}

export type YoutubeRecord = {
    id: number
    title: string
}

export interface ConfluenceSetting extends ConfluencePage {
    enabled: boolean
}

export type JiraProject = { key: string; name: string; archived: any }
export type JiraIssue = { key: string; self: string; id: string; fields: any; archived: any }
export type JiraComment = { key: string; self: string; id: string; fields: any; archived: any }

// Replace the Sidekick interface with the following type

export interface SidekickListItem extends Pick<DB.Sidekick, 'id' | 'placeholder' | 'tags' | 'aiModel' | 'label' | 'chatflowDomain'> {
    isFavorite: boolean
    sharedWith: string
    tagString: string
    chatflowId: string
    chatbotConfig: DB.Sidekick['chatflow']['chatbotConfig']
    flowData: DB.Sidekick['chatflow']['flowData']
    answersConfig: DB.Sidekick['chatflow']['answersConfig']
    constraints: {
        isSpeechToTextEnabled: boolean
        isImageUploadAllowed: boolean
        uploadSizeAndTypes: {
            fileTypes: string[]
            maxUploadSize: number
        }[]
    }
    chatflow: DB.Sidekick['chatflow']
}
// Add the Sidekicks type
export type Sidekicks = SidekickListItem[]

export interface FeedbackPayload {
    id?: string
    chatflowid: string
    chatId: string
    messageId: string
    rating: string
    content: string
    domain?: string
    accessToken?: string
}
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
