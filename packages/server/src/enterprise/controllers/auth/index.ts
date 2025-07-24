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

const ssoSuccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        const ssoToken = req.query.token as string
        const user = await appServer.cachePool.getSSOTokenCache(ssoToken)
        if (!user) return res.status(401).json({ message: 'Invalid or expired SSO token' })
        await appServer.cachePool.deleteSSOTokenCache(ssoToken)
        return res.json(user)
    } catch (error) {
        next(error)
    }
}
export default {
    getAllPermissions,
    ssoSuccess
}
