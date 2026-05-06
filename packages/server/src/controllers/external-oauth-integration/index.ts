import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { Workspace } from '../../enterprise/database/entities/workspace.entity'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { externalOAuthIntegrationService } from '../../services/external-oauth/externalOAuthIntegration.service'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

/**
 * CRUD for Snowflake-style external IdP trust configurations (Okta OIDC, etc.).
 * Requires `externalOAuth:manage` and organization scope from session or API key.
 */
const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgId = req.user?.activeOrganizationId
        if (!orgId) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Missing organization context')
        }
        const app = getRunningExpressApp()
        const rows = await externalOAuthIntegrationService.listByOrg(app.AppDataSource, orgId)
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

const getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgId = req.user?.activeOrganizationId
        const id = req.params.id
        if (!orgId || !id) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing id or organization')
        }
        const app = getRunningExpressApp()
        const row = await externalOAuthIntegrationService.getByIdForOrg(app.AppDataSource, id, orgId)
        if (!row) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Not found' })
        return res.json(row)
    } catch (error) {
        next(error)
    }
}

const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgId = req.user?.activeOrganizationId
        if (!orgId) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Missing organization context')
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing active workspace context')
        }
        const body = req.body as {
            name: string
            issuerUrl: string
            audiences: string[]
            allowedClientIds?: string[]
            permissionScopeMap?: Record<string, string[]>
            customPermissionsClaimName?: string | null
            enabled?: boolean
        }
        if (!body?.name || !body?.issuerUrl || !body?.audiences?.length) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'name, issuerUrl, and audiences are required')
        }
        const app = getRunningExpressApp()
        const workspace = await app.AppDataSource.getRepository(Workspace).findOne({
            where: { id: workspaceId, organizationId: orgId }
        })
        if (!workspace) {
            throw new InternalFlowiseError(StatusCodes.FORBIDDEN, 'Active workspace is not part of the current organization')
        }
        const row = await externalOAuthIntegrationService.create(app.AppDataSource, {
            name: body.name,
            issuerUrl: body.issuerUrl,
            audiences: body.audiences,
            allowedClientIds: body.allowedClientIds ?? null,
            permissionScopeMap: body.permissionScopeMap || {},
            organizationId: orgId,
            workspaceId,
            customPermissionsClaimName: body.customPermissionsClaimName,
            enabled: body.enabled
        })
        return res.status(StatusCodes.CREATED).json(row)
    } catch (error) {
        next(error)
    }
}

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgId = req.user?.activeOrganizationId
        const id = req.params.id
        if (!orgId || !id) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing id or organization')
        }
        const app = getRunningExpressApp()
        const { workspaceId: _omitWorkspaceId, ...patch } = req.body as Record<string, unknown> & { workspaceId?: string }
        const row = await externalOAuthIntegrationService.update(app.AppDataSource, id, orgId, patch)
        if (!row) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Not found' })
        return res.json(row)
    } catch (error) {
        next(error)
    }
}

const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgId = req.user?.activeOrganizationId
        const id = req.params.id
        if (!orgId || !id) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing id or organization')
        }
        const app = getRunningExpressApp()
        const ok = await externalOAuthIntegrationService.delete(app.AppDataSource, id, orgId)
        if (!ok) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Not found' })
        return res.json({ message: 'Deleted' })
    } catch (error) {
        next(error)
    }
}

export default {
    list,
    getOne,
    create,
    update,
    remove
}
