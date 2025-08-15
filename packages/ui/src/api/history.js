import client from './client'

const getHistory = (entityType, entityId, params) => client.get(`/history/${entityType}/${entityId}`, { params })

const getSnapshotById = (historyId) => client.get(`/history/snapshot/${historyId}`)

const restoreSnapshot = (historyId) => client.post(`/history/restore/${historyId}`)

const deleteSnapshot = (historyId) => client.delete(`/history/snapshot/${historyId}`)

const getSnapshotComparison = (historyId1, historyId2) => client.get(`/history/compare/${historyId1}/${historyId2}`)

export default {
    getHistory,
    getSnapshotById,
    restoreSnapshot,
    deleteSnapshot,
    getSnapshotComparison
}
