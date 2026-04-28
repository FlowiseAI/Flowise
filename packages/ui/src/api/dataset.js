import client from './client'

const getAllDatasets = (params) => client.get('/datasets', { params })

//dataset
const getDataset = (id, params) => client.get(`/datasets/set/${id}`, { params })
const createDataset = (body) => client.post(`/datasets/set`, body)
const updateDataset = (id, body) => client.put(`/datasets/set/${id}`, body)
const deleteDataset = (id) => client.delete(`/datasets/set/${id}`)

//rows
const createDatasetRow = (body) => client.post(`/datasets/rows`, body)
const updateDatasetRow = (id, body) => client.put(`/datasets/rows/${id}`, body)
const deleteDatasetRow = (id) => client.delete(`/datasets/rows/${id}`)
const deleteDatasetItems = (ids) => client.patch(`/datasets/rows`, { ids })

const reorderDatasetRow = (body) => client.post(`/datasets/reorder`, body)

export default {
    getAllDatasets,
    getDataset,
    createDataset,
    updateDataset,
    deleteDataset,
    createDatasetRow,
    updateDatasetRow,
    deleteDatasetRow,
    deleteDatasetItems,
    reorderDatasetRow
}
