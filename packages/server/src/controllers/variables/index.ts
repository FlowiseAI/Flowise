import { Request, Response, NextFunction } from 'express'
import variablesServices from '../../services/variables'
import { Variable } from '../../database/entities/Variable'

const createVariable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new Error(`Error: variablesController.createVariable - body not provided!`)
        }
        const body = req.body
        const newVariable = new Variable()
        Object.assign(newVariable, body)
        const apiResponse = await variablesServices.createVariable(newVariable)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllVariables = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await variablesServices.getAllVariables()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createVariable,
    getAllVariables
}
