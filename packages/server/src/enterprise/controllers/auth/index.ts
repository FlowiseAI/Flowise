import { NextFunction, Request, Response } from 'express'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'

const getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        return res.json(appServer.identityManager.getPermissions())
    } catch (error) {
        next(error)
    }
}

export default {
    getAllPermissions
}
