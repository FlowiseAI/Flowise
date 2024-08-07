import { DocumentStore } from './database/entities/DocumentStore'

export enum DocumentStoreStatus {
    EMPTY_SYNC = 'EMPTY',
    SYNC = 'SYNC',
    SYNCING = 'SYNCING',
    STALE = 'STALE',
    NEW = 'NEW',
    UPSERTING = 'UPSERTING',
    UPSERTED = 'UPSERTED'
}

export interface IDocumentStore {
    id: string
    name: string
    description: string
    loaders: string // JSON string
    whereUsed: string // JSON string
    updatedDate: Date
    createdDate: Date
    status: DocumentStoreStatus
    vectorStoreConfig: string | null // JSON string
    embeddingConfig: string | null // JSON string
    recordManagerConfig: string | null // JSON string
}

export interface IDocumentStoreFileChunk {
    id: string
    chunkNo: number
    docId: string
    storeId: string
    pageContent: string
    metadata: string
}

export interface IDocumentStoreFileChunkPagedResponse {
    chunks: IDocumentStoreFileChunk[]
    count: number
    file?: IDocumentStoreLoader
    currentPage: number
    storeName: string
    description: string
}

export interface IDocumentStoreLoader {
    id: string
    loaderId: string
    loaderName: string
    loaderConfig: any // JSON string
    splitterId: string
    splitterName: string
    splitterConfig: any // JSON string
    totalChunks: number
    totalChars: number
    status: DocumentStoreStatus
    storeId?: string
    files?: IDocumentStoreLoaderFile[]
    source?: string
    credential?: string
}

export interface IDocumentStoreLoaderForPreview extends IDocumentStoreLoader {
    rehydrated: boolean
    preview: boolean
    previewChunkCount: number
}

export interface IDocumentStoreLoaderFile {
    id: string
    name: string
    mimePrefix: string
    size: number
    status: DocumentStoreStatus
    uploaded: Date
}

export interface IDocumentStoreWhereUsed {
    id: string
    name: string
}

export class DocumentStoreDTO {
    id: string
    name: string
    description: string
    files: IDocumentStoreLoaderFile[]
    whereUsed: IDocumentStoreWhereUsed[]
    createdDate: Date
    updatedDate: Date
    status: DocumentStoreStatus
    chunkOverlap: number
    splitter: string
    totalChunks: number
    totalChars: number
    chunkSize: number
    loaders: IDocumentStoreLoader[]
    vectorStoreConfig: any
    embeddingConfig: any
    recordManagerConfig: any

    constructor() {}

    static fromEntity(entity: DocumentStore): DocumentStoreDTO {
        let documentStoreDTO = new DocumentStoreDTO()

        Object.assign(documentStoreDTO, entity)
        documentStoreDTO.id = entity.id
        documentStoreDTO.name = entity.name
        documentStoreDTO.description = entity.description
        documentStoreDTO.status = entity.status
        documentStoreDTO.totalChars = 0
        documentStoreDTO.totalChunks = 0

        if (entity.whereUsed) {
            documentStoreDTO.whereUsed = JSON.parse(entity.whereUsed)
        } else {
            documentStoreDTO.whereUsed = []
        }

        if (entity.vectorStoreConfig) {
            documentStoreDTO.vectorStoreConfig = JSON.parse(entity.vectorStoreConfig)
        }
        if (entity.embeddingConfig) {
            documentStoreDTO.embeddingConfig = JSON.parse(entity.embeddingConfig)
        }
        if (entity.recordManagerConfig) {
            documentStoreDTO.recordManagerConfig = JSON.parse(entity.recordManagerConfig)
        }

        if (entity.loaders) {
            documentStoreDTO.loaders = JSON.parse(entity.loaders)
            documentStoreDTO.loaders.map((loader) => {
                documentStoreDTO.totalChars += loader.totalChars
                documentStoreDTO.totalChunks += loader.totalChunks
                switch (loader.loaderId) {
                    case 'pdfFile':
                        loader.source = loader.loaderConfig.pdfFile.replace('FILE-STORAGE::', '')
                        break
                    case 'apiLoader':
                        loader.source = loader.loaderConfig.url + ' (' + loader.loaderConfig.method + ')'
                        break
                    case 'cheerioWebScraper':
                        loader.source = loader.loaderConfig.url
                        break
                    case 'playwrightWebScraper':
                        loader.source = loader.loaderConfig.url
                        break
                    case 'puppeteerWebScraper':
                        loader.source = loader.loaderConfig.url
                        break
                    case 'jsonFile':
                        loader.source = loader.loaderConfig.jsonFile.replace('FILE-STORAGE::', '')
                        break
                    case 'docxFile':
                        loader.source = loader.loaderConfig.docxFile.replace('FILE-STORAGE::', '')
                        break
                    case 'textFile':
                        loader.source = loader.loaderConfig.txtFile.replace('FILE-STORAGE::', '')
                        break
                    case 'unstructuredFileLoader':
                        loader.source = loader.loaderConfig.filePath
                        break
                    default:
                        loader.source = 'None'
                        break
                }
                if (loader.status !== 'SYNC') {
                    documentStoreDTO.status = DocumentStoreStatus.STALE
                }
            })
        }

        return documentStoreDTO
    }

    static fromEntities(entities: DocumentStore[]): DocumentStoreDTO[] {
        return entities.map((entity) => this.fromEntity(entity))
    }

    static toEntity(body: any): DocumentStore {
        const docStore = new DocumentStore()
        Object.assign(docStore, body)
        docStore.loaders = '[]'
        docStore.whereUsed = '[]'
        // when a new document store is created, it is empty and in sync
        docStore.status = DocumentStoreStatus.EMPTY_SYNC
        return docStore
    }
}
