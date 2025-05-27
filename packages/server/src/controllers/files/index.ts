import path from 'path'
import { NextFunction, Request, Response } from 'express'
import { getFilesListFromStorage, getStoragePath, removeSpecificFileFromStorage } from 'flowise-components'
import { updateStorageUsage } from '../../utils/quotaUsage'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const getAllFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const activeOrganizationId = req.user?.activeOrganizationId
        if (!activeOrganizationId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: filesController.getAllFiles - organization ${activeOrganizationId} not found!`
            )
        }
        const apiResponse = await getFilesListFromStorage(activeOrganizationId)
        const filesList = apiResponse.map((file: any) => ({
            ...file,
            // replace org id because we don't want to expose it
            path: file.path.replace(getStoragePath(), '').replace(`${path.sep}${activeOrganizationId}${path.sep}`, '')
        }))
        return res.json(filesList)
    } catch (error) {
        next(error)
    }
}

const deleteFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const activeOrganizationId = req.user?.activeOrganizationId
        if (!activeOrganizationId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: filesController.deleteFile - organization ${activeOrganizationId} not found!`
            )
        }
        const activeWorkspaceId = req.user?.activeWorkspaceId
        if (!activeWorkspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: filesController.deleteFile - workspace ${activeWorkspaceId} not found!`
            )
        }
        const filePath = req.query.path as string
        const paths = filePath.split(path.sep).filter((path) => path !== '')
        const { totalSize } = await removeSpecificFileFromStorage(activeOrganizationId, ...paths)
        await updateStorageUsage(activeOrganizationId, activeWorkspaceId, totalSize, getRunningExpressApp().usageCacheManager)
        return res.json({ message: 'file_deleted' })
    } catch (error) {
        next(error)
    }
}

export default {
    getAllFiles,
    deleteFile
}
