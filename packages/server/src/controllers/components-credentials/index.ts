import { Request, Response, NextFunction } from 'express'
import componentsCredentialsService from '../../services/components-credentials'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

// Get all component credentials
const getAllComponentsCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await componentsCredentialsService.getAllComponentsCredentials()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get component credential via name
const getComponentByName = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.name) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: componentsCredentialsController.getComponentByName - name not provided!`
            )
        }
        const apiResponse = await componentsCredentialsService.getComponentByName(req.params.name)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Returns specific component credential icon via name
const getSingleComponentsCredentialIcon = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.name) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: componentsCredentialsController.getSingleComponentsCredentialIcon - name not provided!`
            )
        }
        const apiResponse = await componentsCredentialsService.getSingleComponentsCredentialIcon(req.params.name)
        return res.sendFile(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllComponentsCredentials,
    getComponentByName,
    getSingleComponentsCredentialIcon
}
