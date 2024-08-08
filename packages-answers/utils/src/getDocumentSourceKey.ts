import { DocumentFilter } from 'types'

export const getDocumentSourceKey = (source: string, type: string, documentFilter: DocumentFilter) =>
    `${source}:${type}:${JSON.stringify(documentFilter)}`
