import { Request, Response, NextFunction } from 'express'
import variablesService from '../../services/variables'

// CREATE new variable
const createVariable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new Error(`Error: variablesController.createVariable - body not provided!`)
        }
        const apiResponse = await variablesService.createVariable(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// READ all variables
const getAllVariables = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await variablesService.getAllVariables()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// UPDATE variable
const updateVariable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: variablesController.updateVariable - id not provided!')
        }
        if (typeof req.body === 'undefined') {
            throw new Error('Error: variablesController.updateVariable - body not provided!')
        }
        const apiResponse = await variablesService.updateVariable(req.body, req.params.id)
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

// DELETE variable
const deleteVariable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: variablesController.deleteVariable - id not provided!')
        }
        const apiResponse = await variablesService.deleteVariable(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createVariable,
    deleteVariable,
    getAllVariables,
    updateVariable
}
