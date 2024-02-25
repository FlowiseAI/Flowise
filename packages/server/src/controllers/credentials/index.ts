import { Request, Response, NextFunction } from 'express'
import credentialsService from '../../services/credentials'

// Create new credential
const createCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error('Error: credentialController.getSingleCredential - body not provided!')
        }
        const apiResponse = await credentialsService.createCredential(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Delete all credentials from chatflowid
const deleteAllCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: credentialController.deleteAllCredentials - id not provided!')
        }
        const apiResponse = await credentialsService.deleteAllCredentials(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get all credentials
const getAllCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //@ts-ignore
        const apiResponse = await credentialsService.getAllCredentials(req.query.credentialName)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get specific credential
const getSingleCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: credentialController.getSingleCredential - id not provided!')
        }
        const apiResponse = await credentialsService.getSingleCredential(req.params.id)
        //@ts-ignore
        if (typeof apiResponse.executionError !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Update credential
const updateCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: credentialController.updateCredential - id not provided!')
        }
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error('Error: credentialController.updateCredential - body not provided!')
        }
        const apiResponse = await credentialsService.updateCredential(req.params.id, req.body)
        //@ts-ignore
        if (typeof apiResponse.executionError !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createCredential,
    deleteAllCredentials,
    getAllCredentials,
    getSingleCredential,
    updateCredential
}
