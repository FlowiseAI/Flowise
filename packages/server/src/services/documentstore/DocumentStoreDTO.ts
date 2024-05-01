import { DocumentStoreStatus } from '../../Interface'
import { DocumentStore } from '../../database/entities/DocumentStore'

export class DocumentStoreDTO {
    id: string
    name: string
    description: string
    files: any[]
    whereUsed: any[]
    createdDate: Date
    updatedDate: Date
    status: DocumentStoreStatus
    chunkOverlap: number
    splitter: string
    totalFiles: number
    totalChunks: number
    totalChars: number
    chunkSize: number
    loaders: any[]

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
