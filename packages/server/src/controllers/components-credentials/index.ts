import { Request, Response, NextFunction } from 'express'
import componentsCredentialsService from '../../services/components-credentials'

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
const getSingleComponentsCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.name === 'undefined' || req.params.name === '') {
            throw new Error(`Error: componentsCredentialsController.getSingleComponentsCredential - name not provided!`)
        }
        const apiResponse = await componentsCredentialsService.getSingleComponentsCredential(req.params.name)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Returns specific component credential icon via name
const getSingleComponentsCredentialIcon = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.name === 'undefined' || req.params.name === '') {
            throw new Error(`Error: componentsCredentialsController.getSingleComponentsCredentialIcon - name not provided!`)
        }
        const apiResponse = await componentsCredentialsService.getSingleComponentsCredentialIcon(req.params.name)
        return res.sendFile(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllComponentsCredentials,
    getSingleComponentsCredential,
    getSingleComponentsCredentialIcon
}
