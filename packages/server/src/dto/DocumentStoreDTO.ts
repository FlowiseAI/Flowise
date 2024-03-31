import { DocumentStoreStatus } from '../Interface'
import { DocumentStore } from '../database/entities/DocumentStore'
import { convertToValidFilename } from '../utils'

export class DocumentStoreDTO {
    id: string
    name: string
    description: string
    subFolder: string
    files: any[]
    type: string
    createdDate: Date
    updatedDate: Date
    status: DocumentStoreStatus
    chunkOverlap: number
    splitter: string
    codeLanguage: string
    totalDocs: number
    totalFiles: number
    totalChunks: number
    totalChars: number
    chunkSize: number

    constructor() {}

    static fromEntity(entity: DocumentStore): DocumentStoreDTO {
        let documentStoreDTO = new DocumentStoreDTO()
        let config = JSON.parse(entity.config)

        Object.assign(documentStoreDTO, entity)
        documentStoreDTO.id = entity.id
        documentStoreDTO.name = entity.name
        documentStoreDTO.description = entity.description
        documentStoreDTO.type = entity.type
        documentStoreDTO.splitter = config.splitter
        documentStoreDTO.codeLanguage = config.codeLanguage
        documentStoreDTO.chunkSize = config.chunkSize
        documentStoreDTO.chunkOverlap = config.chunkOverlap
        documentStoreDTO.subFolder = entity.subFolder

        if (entity.metrics) {
            let metrics = JSON.parse(entity.metrics)
            documentStoreDTO.totalFiles = metrics.totalFiles
            documentStoreDTO.totalChars = metrics.totalChars
            documentStoreDTO.totalChunks = metrics.totalChunks
        }
        documentStoreDTO.status = entity.status
        if (entity.files) {
            const filesObj = JSON.parse(entity.files)
            documentStoreDTO.files = filesObj
            documentStoreDTO.totalFiles = filesObj.length
        }
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
        const config = {
            splitter: body.splitter,
            codeLanguage: body.codeLanguage,
            chunkSize: body.chunkSize,
            chunkOverlap: body.chunkOverlap
        }
        docStore.config = JSON.stringify(config)
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
