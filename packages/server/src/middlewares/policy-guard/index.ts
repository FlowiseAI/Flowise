import { NextFunction, Request, Response } from 'express'
import { GeneralErrorMessage } from '../../utils/constants'
import { ErrorMessage } from '../../enterprise/Interface.Enterprise'

const policy = require('../policy.json')

interface Policy {
    path: string
    method: string
    authMethods: string[]
    entitlements: string[]
}

const policyMap: Map<string, Policy> = new Map()

// Load policies into a map for efficient lookup
policy.forEach((p: Policy) => {
    policyMap.set(`${p.method}:${p.path}`, p)
})

export const index = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    const requestPath = req.path.replace(/\/$/, '') // Remove trailing slash
    const requestMethod = req.method

    const matchingPolicy = policyMap.get(`${requestMethod}:${requestPath}`)

    if (!matchingPolicy) {
        // Check for policies with path parameters
        for (const [key, p] of policyMap.entries()) {
            const policyPathParts = p.path.split('/')
            const requestPathParts = requestPath.split('/')

            if (policyPathParts.length === requestPathParts.length && p.method === requestMethod) {
                let isMatch = true
                const params: { [key: string]: string } = {}

                for (let i = 0; i < policyPathParts.length; i++) {
                    if (policyPathParts[i].startsWith(':')) {
                        params[policyPathParts[i].substring(1)] = requestPathParts[i]
                    } else if (policyPathParts[i] !== requestPathParts[i]) {
                        isMatch = false
                        break
                    }
                }

                if (isMatch) {
                    ;(req as any).params = { ...req.params, ...params }
                    return authorize(user, p, res, next)
                }
            }
        }
        return res.status(404).json({ message: 'Not Found' })
    }

    return authorize(user, matchingPolicy, res, next)
}

const authorize = (user: any, policy: Policy, res: Response, next: NextFunction) => {
    if (policy.authMethods.includes('public')) {
        return next()
    }

    if (!user) {
        return res.status(401).json({ message: GeneralErrorMessage.UNAUTHORIZED })
    }

    if (user.isApiKeyValidated && policy.authMethods.includes('apiKey')) {
        return next()
    }

    if (user.isOrganizationAdmin) {
        return next()
    }

    if (policy.authMethods.includes('jwt')) {
        const userPermissions = user.permissions || []
        const hasPermission = policy.entitlements.some((p) => userPermissions.includes(p))

        if (hasPermission) {
            return next()
        }
    }

    return res.status(403).json({ message: ErrorMessage.FORBIDDEN })
}

export default index
