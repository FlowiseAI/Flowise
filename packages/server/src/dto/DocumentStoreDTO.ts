import { DocumentStoreStatus } from '../Interface'
import { DocumentStore } from '../database/entities/DocumentStore'
import { convertToValidFilename } from '../utils'

export class DocumentStoreDTO {
    id: string
    name: string
    description: string
    subFolder: string
    files: any[]
    whereUsed: any[]
    createdDate: Date
    updatedDate: Date
    status: DocumentStoreStatus
    chunkOverlap: number
    splitter: string
    codeLanguage: string
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
        documentStoreDTO.subFolder = entity.subFolder
        if (entity.whereUsed) {
            documentStoreDTO.whereUsed = JSON.parse(entity.whereUsed)
        } else {
            documentStoreDTO.whereUsed = []
        }
        if (entity.metrics) {
            let metrics = JSON.parse(entity.metrics)
            documentStoreDTO.totalFiles = metrics.totalFiles
            documentStoreDTO.totalChars = metrics.totalChars
            documentStoreDTO.totalChunks = metrics.totalChunks
        }
        if (entity.files) {
            documentStoreDTO.loaders = JSON.parse(entity.files)
        }
        documentStoreDTO.status = entity.status
        return documentStoreDTO
    }

    static fromEntities(entities: DocumentStore[]): DocumentStoreDTO[] {
        return entities.map((entity) => this.fromEntity(entity))
    }

    static toEntity(body: any): DocumentStore {
        const docStore = new DocumentStore()
        Object.assign(docStore, body)
        docStore.subFolder = convertToValidFilename(docStore.name)
        docStore.files = '[]'
        docStore.whereUsed = '[]'
        // const config = {
        //     splitter: body.splitter,
        //     codeLanguage: body.codeLanguage,
        //     chunkSize: body.chunkSize,
        //     chunkOverlap: body.chunkOverlap
        // }
        // docStore.config = JSON.stringify(config)
        docStore.metrics = JSON.stringify({
            totalFiles: 0,
            totalChars: 0,
            totalChunks: 0
        })
        // when a new document store is created, it is empty and in sync
        docStore.status = DocumentStoreStatus.EMPTY_SYNC
        return docStore
    }
}
