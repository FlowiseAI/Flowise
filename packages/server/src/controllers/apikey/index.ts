import { Request, Response, NextFunction } from 'express'
import apikeyService from '../../services/apikey'

// Get api keys
const getAllApiKeys = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await apikeyService.getAllApiKeys()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body.keyName === 'undefined' || req.body.keyName === '') {
            throw new Error(`Error: apikeyController.createApiKey - keyName not provided!`)
        }
        const apiResponse = await apikeyService.createApiKey(req.body.keyName)
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
        const apiResponse = await apikeyService.updateApiKey(req.params.id, req.body.keyName)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createApiKey,
    getAllApiKeys,
    updateApiKey
}
