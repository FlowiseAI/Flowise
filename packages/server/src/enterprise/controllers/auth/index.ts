import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { Platform } from '../../../Interface'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { LoggedInUser } from '../../Interface.Enterprise'

const getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        const type = req.params.type as string
        const allPermissions = appServer.identityManager.getPermissions().toJSON()
        const user = req.user as LoggedInUser

        let permissions: { [key: string]: { key: string; value: string }[] } = allPermissions

        // Mapping of feature flags to permission prefixes
        const featureToPermissionMap: { [key: string]: string[] } = {
            'feat:login-activity': ['loginActivity:'],
            'feat:logs': ['logs:'],
            'feat:roles': ['roles:'],
            'feat:share': ['credentials:share', 'templates:custom-share'],
            'feat:sso-config': ['sso:'],
            'feat:users': ['users:'],
            'feat:workspaces': ['workspace:']
        }

        // Category filtering for non-ROLE type
        if (type !== 'ROLE') {
            const filteredPermissions: { [key: string]: { key: string; value: string }[] } = {}

            for (const [category, categoryPermissions] of Object.entries(allPermissions)) {
                // Exclude workspace and admin categories
                if (category !== 'workspace' && category !== 'admin') {
                    filteredPermissions[category] = categoryPermissions
                }
            }

            permissions = filteredPermissions
        }

        // Feature-based filtering for Cloud platform
        if (type !== 'ROLE' && appServer.identityManager.getPlatformType() === Platform.CLOUD) {
            const userFeatures = user.features
            if (userFeatures) {
                const disabledFeatures = Object.entries(userFeatures).filter(([, value]) => value === 'false')

                // Get list of disabled permission prefixes
                const disabledPermissionPrefixes: string[] = []
                disabledFeatures.forEach(([featureKey]) => {
                    const prefixes = featureToPermissionMap[featureKey]
                    if (prefixes) {
                        disabledPermissionPrefixes.push(...prefixes)
                    }
                })

                // Filter out permissions based on disabled features
                const filteredPermissions: { [key: string]: { key: string; value: string }[] } = {}

                for (const [category, categoryPermissions] of Object.entries(permissions)) {
                    const filteredCategoryPermissions = (categoryPermissions as any[]).filter((permission) => {
                        // Check if this permission starts with any disabled prefix
                        const isDisabled = disabledPermissionPrefixes.some((prefix) => permission.key.startsWith(prefix))
                        return !isDisabled
                    })

                    // Only include category if it has remaining permissions
                    if (filteredCategoryPermissions.length > 0) {
                        filteredPermissions[category] = filteredCategoryPermissions
                    }
                }

                permissions = filteredPermissions
            }
        }

        // User-level filtering for non-admin users
        if (type !== 'ROLE' && user.isOrganizationAdmin === false) {
            const userPermissions = user.permissions as string[]
            const filteredPermissions: { [key: string]: { key: string; value: string }[] } = {}

            for (const [category, categoryPermissions] of Object.entries(permissions)) {
                const filteredCategoryPermissions = (categoryPermissions as any[]).filter((permission) =>
                    userPermissions?.includes(permission.key)
                )

                if (filteredCategoryPermissions.length > 0) {
                    filteredPermissions[category] = filteredCategoryPermissions
                }
            }

            permissions = filteredPermissions
        }

        return res.status(StatusCodes.OK).json(permissions)
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
