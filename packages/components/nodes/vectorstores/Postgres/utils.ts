import { defaultChain, INodeData } from '../../../src'

export function getHost(nodeData?: INodeData) {
    return defaultChain(nodeData?.inputs?.host, process.env.POSTGRES_VECTORSTORE_HOST)
}

export function getDatabase(nodeData?: INodeData) {
    return defaultChain(nodeData?.inputs?.database, process.env.POSTGRES_VECTORSTORE_DATABASE)
}

export function getPort(nodeData?: INodeData) {
    return defaultChain(nodeData?.inputs?.port, process.env.POSTGRES_VECTORSTORE_PORT, '5432')
}

export function getTableName(nodeData?: INodeData) {
    return defaultChain(nodeData?.inputs?.tableName, process.env.POSTGRES_VECTORSTORE_TABLE_NAME, 'documents')
}

export function getContentColumnName(nodeData?: INodeData) {
    return defaultChain(nodeData?.inputs?.contentColumnName, process.env.POSTGRES_VECTORSTORE_CONTENT_COLUMN_NAME, 'pageContent')
}
