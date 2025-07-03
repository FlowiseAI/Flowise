import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { GitConfigService } from '../services/git-config.service'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GitConfig } from '../database/entities/git-config.entity'

export class GitConfigController {
    public async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = req.user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not found')
            }
            const organizationId = currentUser.activeOrganizationId
            const service = new GitConfigService()
            const configs = await service.getAllGitConfigs(organizationId)
            return res.status(StatusCodes.OK).json(configs)
        } catch (error) {
            next(error)
        }
    }

    public async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = req.user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not found')
            }
            const organizationId = currentUser.activeOrganizationId

            if (!req.params || !req.params.id) {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'id not provided!')
            }
            const service = new GitConfigService()
            const config = await service.getGitConfigById(req.params.id, organizationId)
            if (!config) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Git config not found' })
            return res.status(StatusCodes.OK).json(config)
        } catch (error) {
            next(error)
        }
    }

    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.body) {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'body not provided!')
            }
            const currentUser = req.user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not found')
            }
            const organizationId = currentUser.activeOrganizationId
            const body: Partial<GitConfig> = {
                ...req.body,
                organizationId,
                createdBy: currentUser.id,
                createdByUser: currentUser,
                updatedBy: currentUser.id,
                updatedByUser: currentUser,
                isActive: true
            }
            const service = new GitConfigService()
            const config = await service.createGitConfig(body)
            return res.status(StatusCodes.CREATED).json(config)
        } catch (error) {
            next(error)
        }
    }

    public async testConnection(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.body || !req.body.username || !req.body.secret || !req.body.repository) {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'username, secret, and repository are required!')
            }
            const service = new GitConfigService()
            const config = await service.testGitConfig(req.body)
            return res.status(StatusCodes.OK).json(config)
        } catch (error) {
            next(error)
        }
    }

    public async update(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.params || !req.params.id) {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'id not provided!')
            }
            if (!req.body) {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'body not provided!')
            }
            const currentUser = req.user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not found')
            }
            const organizationId = currentUser.activeOrganizationId
            const body = {
                ...req.body,
                organizationId
            }
            const service = new GitConfigService()
            const config = await service.updateGitConfig(req.params.id, body)
            if (!config) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Git config not found' })
            return res.status(StatusCodes.OK).json(config)
        } catch (error) {
            next(error)
        }
    }

    public async delete(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.params || !req.params.id) {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'id not provided!')
            }
            const currentUser = req.user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not found')
            }
            const organizationId = currentUser.activeOrganizationId
            const service = new GitConfigService()
            const result = await service.deleteGitConfig(req.params.id, organizationId)
            if (!result) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Git config not found' })
            return res.status(StatusCodes.NO_CONTENT).send()
        } catch (error) {
            next(error)
        }
    }
} 