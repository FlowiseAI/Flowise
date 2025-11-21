import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { Dataset } from '../../database/entities/Dataset'
import { DatasetRow } from '../../database/entities/DatasetRow'
import { Readable } from 'stream'
import { In } from 'typeorm'

import csv from 'csv-parser'

const getAllDatasets = async (workspaceId: string, page: number = -1, limit: number = -1) => {
    try {
        const appServer = getRunningExpressApp()
        const queryBuilder = appServer.AppDataSource.getRepository(Dataset).createQueryBuilder('ds').orderBy('ds.updatedDate', 'DESC')
        if (page > 0 && limit > 0) {
            queryBuilder.skip((page - 1) * limit)
            queryBuilder.take(limit)
        }
        if (workspaceId) queryBuilder.andWhere('ds.workspaceId = :workspaceId', { workspaceId })

        const [data, total] = await queryBuilder.getManyAndCount()

        const returnObj: Dataset[] = []

        // TODO: This is a hack to get the row count for each dataset. Need to find a better way to do this
        for (const dataset of data) {
            ;(dataset as any).rowCount = await appServer.AppDataSource.getRepository(DatasetRow).count({
                where: { datasetId: dataset.id }
            })
            returnObj.push(dataset)
        }
        if (page > 0 && limit > 0) {
            return { total, data: returnObj }
        } else {
            return returnObj
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: datasetService.getAllDatasets - ${getErrorMessage(error)}`
        )
    }
}

const getDataset = async (id: string, workspaceId: string, page: number = -1, limit: number = -1) => {
    try {
        const appServer = getRunningExpressApp()
        const dataset = await appServer.AppDataSource.getRepository(Dataset).findOneBy({
            id: id,
            workspaceId: workspaceId
        })
        const queryBuilder = appServer.AppDataSource.getRepository(DatasetRow).createQueryBuilder('dsr').orderBy('dsr.sequenceNo', 'ASC')
        queryBuilder.andWhere('dsr.datasetId = :datasetId', { datasetId: id })
        if (page > 0 && limit > 0) {
            queryBuilder.skip((page - 1) * limit)
            queryBuilder.take(limit)
        }
        let [data, total] = await queryBuilder.getManyAndCount()
        // special case for sequence numbers == -1 (this happens when the update script is run and all rows are set to -1)
        // check if there are any sequence numbers == -1, if so set them to the max sequence number + 1
        const missingSequenceNumbers = data.filter((item) => item.sequenceNo === -1)
        if (missingSequenceNumbers.length > 0) {
            const maxSequenceNumber = data.reduce((prev, current) => (prev.sequenceNo > current.sequenceNo ? prev : current))
            let sequenceNo = maxSequenceNumber.sequenceNo + 1
            for (const zeroSequenceNumber of missingSequenceNumbers) {
                zeroSequenceNumber.sequenceNo = sequenceNo++
            }
            await appServer.AppDataSource.getRepository(DatasetRow).save(missingSequenceNumbers)
            // now get the items again
            const queryBuilder2 = appServer.AppDataSource.getRepository(DatasetRow)
                .createQueryBuilder('dsr')
                .orderBy('dsr.sequenceNo', 'ASC')
            queryBuilder2.andWhere('dsr.datasetId = :datasetId', { datasetId: id })
            if (page > 0 && limit > 0) {
                queryBuilder2.skip((page - 1) * limit)
                queryBuilder2.take(limit)
            }
            ;[data, total] = await queryBuilder2.getManyAndCount()
        }

        return {
            ...dataset,
            rows: data,
            total
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: datasetService.getDataset - ${getErrorMessage(error)}`)
    }
}

const reorderDatasetRow = async (datasetId: string, rows: any[], workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        await appServer.AppDataSource.transaction(async (entityManager) => {
            // rows are an array of { id: string, sequenceNo: number }
            // update the sequence numbers in the DB
            for (const row of rows) {
                const item = await entityManager.getRepository(DatasetRow).findOneBy({
                    id: row.id
                })
                if (!item) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Dataset Row ${row.id} not found`)
                item.sequenceNo = row.sequenceNo
                await entityManager.getRepository(DatasetRow).save(item)
            }
            await changeUpdateOnDataset(datasetId, workspaceId, entityManager)
        })
        return { message: 'Dataset row reordered successfully' }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: datasetService.reorderDatasetRow - ${getErrorMessage(error)}`
        )
    }
}

const _readCSV = async (stream: Readable, results: any[]) => {
    return new Promise((resolve, reject) => {
        stream
            .pipe(
                csv({
                    headers: false
                })
            )
            .on('data', (data) => results.push(data))
            .on('end', () => {
                resolve(results)
            })
            .on('error', reject)
    })
}

const _csvToDatasetRows = async (datasetId: string, csvString: string, firstRowHeaders: boolean) => {
    try {
        const appServer = getRunningExpressApp()
        // get the max value first
        const maxValueEntity = await appServer.AppDataSource.getRepository(DatasetRow).find({
            order: {
                sequenceNo: 'DESC'
            },
            take: 1
        })
        let sequenceNo = 0
        if (maxValueEntity && maxValueEntity.length > 0) {
            sequenceNo = maxValueEntity[0].sequenceNo
        }
        sequenceNo++
        // Array to hold parsed records
        const results: any[] = []
        let files: string[] = []

        if (csvString.startsWith('[') && csvString.endsWith(']')) {
            files = JSON.parse(csvString)
        } else {
            files = [csvString]
        }

        for (const file of files) {
            const splitDataURI = file.split(',')
            splitDataURI.pop()
            const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
            const csvString = bf.toString('utf8')

            // Convert CSV string to a Readable stream
            const stream = Readable.from(csvString)
            const rows: any[] = []
            await _readCSV(stream, rows)
            results.push(...rows)
        }
        if (results && results?.length > 0) {
            for (let r = 0; r < results.length; r++) {
                const row = results[r]
                let input = ''
                let output = ''
                if (firstRowHeaders && r === 0) {
                    continue
                }
                input = row['0']
                output = row['1']
                const newRow = appServer.AppDataSource.getRepository(DatasetRow).create(new DatasetRow())
                newRow.datasetId = datasetId
                newRow.input = input
                newRow.output = output
                newRow.sequenceNo = sequenceNo
                await appServer.AppDataSource.getRepository(DatasetRow).save(newRow)
                sequenceNo++
            }
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: datasetService._csvToDatasetRows - ${getErrorMessage(error)}`
        )
    }
}

// Create new dataset
const createDataset = async (body: any) => {
    try {
        const appServer = getRunningExpressApp()
        const newDs = new Dataset()
        Object.assign(newDs, body)
        const dataset = appServer.AppDataSource.getRepository(Dataset).create(newDs)
        const result = await appServer.AppDataSource.getRepository(Dataset).save(dataset)
        if (body.csvFile) {
            await _csvToDatasetRows(result.id, body.csvFile, body.firstRowHeaders)
        }
        return result
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: datasetService.createDataset - ${getErrorMessage(error)}`)
    }
}

// Update dataset
const updateDataset = async (id: string, body: any, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dataset = await appServer.AppDataSource.getRepository(Dataset).findOneBy({
            id: id,
            workspaceId: workspaceId
        })
        if (!dataset) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Dataset ${id} not found`)

        const updateDataset = new Dataset()
        Object.assign(updateDataset, body)
        appServer.AppDataSource.getRepository(Dataset).merge(dataset, updateDataset)
        const result = await appServer.AppDataSource.getRepository(Dataset).save(dataset)
        return result
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: datasetService.updateDataset - ${getErrorMessage(error)}`)
    }
}

// Delete dataset via id
const deleteDataset = async (id: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const result = await appServer.AppDataSource.getRepository(Dataset).delete({ id: id, workspaceId: workspaceId })

        // delete all rows for this dataset
        await appServer.AppDataSource.getRepository(DatasetRow).delete({ datasetId: id })

        return result
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: datasetService.deleteDataset - ${getErrorMessage(error)}`)
    }
}

// Create new row in a given dataset
const addDatasetRow = async (body: any) => {
    try {
        const appServer = getRunningExpressApp()
        if (body.csvFile) {
            await _csvToDatasetRows(body.datasetId, body.csvFile, body.firstRowHeaders)
            await changeUpdateOnDataset(body.datasetId, body.workspaceId)
            return { message: 'Dataset rows added successfully' }
        } else {
            // get the max value first
            const maxValueEntity = await appServer.AppDataSource.getRepository(DatasetRow).find({
                where: {
                    datasetId: body.datasetId
                },
                order: {
                    sequenceNo: 'DESC'
                },
                take: 1
            })
            let sequenceNo = 0
            if (maxValueEntity && maxValueEntity.length > 0) {
                sequenceNo = maxValueEntity[0].sequenceNo
            }
            const newDs = new DatasetRow()
            Object.assign(newDs, body)
            newDs.sequenceNo = sequenceNo === 0 ? sequenceNo : sequenceNo + 1
            const row = appServer.AppDataSource.getRepository(DatasetRow).create(newDs)
            const result = await appServer.AppDataSource.getRepository(DatasetRow).save(row)
            await changeUpdateOnDataset(body.datasetId, body.workspaceId)
            return result
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: datasetService.createDatasetRow - ${getErrorMessage(error)}`
        )
    }
}

const changeUpdateOnDataset = async (id: string, workspaceId: string, entityManager?: any) => {
    const appServer = getRunningExpressApp()
    const dataset = await appServer.AppDataSource.getRepository(Dataset).findOneBy({
        id: id,
        workspaceId: workspaceId
    })
    if (!dataset) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Dataset ${id} not found`)

    dataset.updatedDate = new Date()
    if (entityManager) {
        await entityManager.getRepository(Dataset).save(dataset)
    } else {
        await appServer.AppDataSource.getRepository(Dataset).save(dataset)
    }
}

// Update row for a dataset
const updateDatasetRow = async (id: string, body: any) => {
    try {
        const appServer = getRunningExpressApp()
        const item = await appServer.AppDataSource.getRepository(DatasetRow).findOneBy({
            id: id
        })
        if (!item) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Dataset Row ${id} not found`)

        const updateItem = new DatasetRow()
        Object.assign(updateItem, body)
        appServer.AppDataSource.getRepository(DatasetRow).merge(item, updateItem)
        const result = await appServer.AppDataSource.getRepository(DatasetRow).save(item)
        await changeUpdateOnDataset(body.datasetId, body.workspaceId)
        return result
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: datasetService.updateDatasetRow - ${getErrorMessage(error)}`
        )
    }
}

// Delete dataset row via id
const deleteDatasetRow = async (id: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        return await appServer.AppDataSource.transaction(async (entityManager) => {
            const item = await entityManager.getRepository(DatasetRow).findOneBy({
                id: id
            })
            if (!item) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Dataset Row ${id} not found`)

            const result = await entityManager.getRepository(DatasetRow).delete({ id: id })
            await changeUpdateOnDataset(item.datasetId, workspaceId, entityManager)
            return result
        })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: datasetService.deleteDatasetRow - ${getErrorMessage(error)}`
        )
    }
}

// Delete dataset rows via ids
const patchDeleteRows = async (ids: string[] = [], workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const datasetItemsToBeDeleted = await appServer.AppDataSource.getRepository(DatasetRow).find({
            where: {
                id: In(ids)
            }
        })
        const dbResponse = await appServer.AppDataSource.getRepository(DatasetRow).delete(ids)

        const datasetIds = [...new Set(datasetItemsToBeDeleted.map((item) => item.datasetId))]
        for (const datasetId of datasetIds) {
            await changeUpdateOnDataset(datasetId, workspaceId)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: datasetService.patchDeleteRows - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAllDatasets,
    getDataset,
    createDataset,
    updateDataset,
    deleteDataset,
    addDatasetRow,
    updateDatasetRow,
    deleteDatasetRow,
    patchDeleteRows,
    reorderDatasetRow
}
