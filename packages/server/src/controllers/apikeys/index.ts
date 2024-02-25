import { Request, Response, NextFunction } from 'express'
import apikeysService from '../../services/apikeys'

// Add new api key
const createApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body.keyName === 'undefined' || req.body.keyName === '') {
            throw new Error(`Error: apikeysController.createApiKey - keyName not provided!`)
        }
        const apiResponse = await apikeysService.createApiKey(req.body.keyName)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Delete new api key
const deleteApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: apikeysController.deleteApiKey - id not provided!`)
        }
        const apiResponse = await apikeysService.deleteApiKey(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get all api keys
const getAllApiKeys = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await apikeysService.getAllApiKeys()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Update api key
const updateApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: apikeysController.updateApiKey - id not provided!`)
        }
        if (typeof req.body.keyName === 'undefined' || req.body.keyName === '') {
            throw new Error(`Error: apikeysController.updateApiKey - keyName not provided!`)
        }
        const apiResponse = await apikeysService.updateApiKey(req.params.id, req.body.keyName)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get all api keys
const verifyApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.apiKey === 'undefined' || req.params.apiKey === '') {
            throw new Error(`Error: apikeysController.verifyApiKey - apiKey not provided!`)
        }
        const apiResponse = await apikeysService.verifyApiKey(req.params.apiKey)
        if (typeof apiResponse.executionError !== 'undefined') {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createApiKey,
    deleteApiKey,
    getAllApiKeys,
    updateApiKey,
    verifyApiKey
}
