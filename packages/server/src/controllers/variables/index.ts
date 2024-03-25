import { Request, Response, NextFunction } from 'express'
import variablesServices from '../../services/variables'

const getAllVariables = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await variablesServices.getAllVariables()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllVariables
}
