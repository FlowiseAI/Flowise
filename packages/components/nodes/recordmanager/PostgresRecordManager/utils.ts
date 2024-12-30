import { defaultChain, INodeData } from '../../../src'

export function getHost(nodeData?: INodeData) {
    return defaultChain(nodeData?.inputs?.host, process.env.POSTGRES_RECORDMANAGER_HOST)
}

export function getDatabase(nodeData?: INodeData) {
    return defaultChain(nodeData?.inputs?.database, process.env.POSTGRES_RECORDMANAGER_DATABASE)
}

export function getPort(nodeData?: INodeData) {
    return defaultChain(nodeData?.inputs?.port, process.env.POSTGRES_RECORDMANAGER_PORT, '5432')
}

export function getTableName(nodeData?: INodeData) {
    return defaultChain(nodeData?.inputs?.tableName, process.env.POSTGRES_RECORDMANAGER_TABLE_NAME, 'upsertion_records')
}
