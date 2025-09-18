import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { OrganizationErrorMessage, OrganizationService } from '../services/organization.service'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { Organization } from '../database/entities/organization.entity'
import { GeneralErrorMessage } from '../../utils/constants'
import { OrganizationUserService } from '../services/organization-user.service'
import { getCurrentUsage } from '../../utils/quotaUsage'

export class OrganizationController {
    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const organizationUserService = new OrganizationUserService()
            const newOrganization = await organizationUserService.createOrganization(req.body)
            return res.status(StatusCodes.CREATED).json(newOrganization)
        } catch (error) {
            next(error)
        }
    }

    public async read(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const query = req.query as Partial<Organization>
            const organizationService = new OrganizationService()

            let organization: Organization | null
            if (query.id) {
                organization = await organizationService.readOrganizationById(query.id, queryRunner)
                if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
            } else if (query.name) {
                organization = await organizationService.readOrganizationByName(query.name, queryRunner)
                if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
            } else {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
            }

            return res.status(StatusCodes.OK).json(organization)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    public async update(req: Request, res: Response, next: NextFunction) {
        try {
            const organizationService = new OrganizationService()
            const organization = await organizationService.updateOrganization(req.body)
            return res.status(StatusCodes.OK).json(organization)
        } catch (error) {
            next(error)
        }
    }

    public async getAdditionalSeatsQuantity(req: Request, res: Response, next: NextFunction) {
        try {
            const { subscriptionId } = req.query
            if (!subscriptionId) {
                return res.status(400).json({ error: 'Subscription ID is required' })
            }
            const organizationUserservice = new OrganizationUserService()
            const totalOrgUsers = await organizationUserservice.readOrgUsersCountByOrgId(req.user?.activeOrganizationId as string)

            const identityManager = getRunningExpressApp().identityManager
            const result = await identityManager.getAdditionalSeatsQuantity(subscriptionId as string)

            return res.status(StatusCodes.OK).json({ ...result, totalOrgUsers })
        } catch (error) {
            next(error)
        }
    }

    public async getCustomerWithDefaultSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { customerId } = req.query
            if (!customerId) {
                return res.status(400).json({ error: 'Customer ID is required' })
            }
            const identityManager = getRunningExpressApp().identityManager
            const result = await identityManager.getCustomerWithDefaultSource(customerId as string)

            return res.status(StatusCodes.OK).json(result)
        } catch (error) {
            next(error)
        }
    }

    public async getAdditionalSeatsProration(req: Request, res: Response, next: NextFunction) {
        try {
            const { subscriptionId, quantity } = req.query
            if (!subscriptionId) {
                return res.status(400).json({ error: 'Customer ID is required' })
            }
            if (quantity === undefined) {
                return res.status(400).json({ error: 'Quantity is required' })
            }
            const identityManager = getRunningExpressApp().identityManager
            const result = await identityManager.getAdditionalSeatsProration(subscriptionId as string, parseInt(quantity as string))

            return res.status(StatusCodes.OK).json(result)
        } catch (error) {
            next(error)
        }
    }

    public async getPlanProration(req: Request, res: Response, next: NextFunction) {
        try {
            const { subscriptionId, newPlanId } = req.query
            if (!subscriptionId) {
                return res.status(400).json({ error: 'Subscription ID is required' })
            }
            if (!newPlanId) {
                return res.status(400).json({ error: 'New plan ID is required' })
            }
            const identityManager = getRunningExpressApp().identityManager
            const result = await identityManager.getPlanProration(subscriptionId as string, newPlanId as string)

            return res.status(StatusCodes.OK).json(result)
        } catch (error) {
            next(error)
        }
    }

    public async updateAdditionalSeats(req: Request, res: Response, next: NextFunction) {
        try {
            const { subscriptionId, quantity, prorationDate } = req.body
            if (!subscriptionId) {
                return res.status(400).json({ error: 'Subscription ID is required' })
            }
            if (quantity === undefined) {
                return res.status(400).json({ error: 'Quantity is required' })
            }
            if (!prorationDate) {
                return res.status(400).json({ error: 'Proration date is required' })
            }
            const identityManager = getRunningExpressApp().identityManager
            const result = await identityManager.updateAdditionalSeats(subscriptionId, quantity, prorationDate)

            return res.status(StatusCodes.OK).json(result)
        } catch (error) {
            next(error)
        }
    }

    public async updateSubscriptionPlan(req: Request, res: Response, next: NextFunction) {
        try {
            const { subscriptionId, newPlanId, prorationDate } = req.body
            if (!subscriptionId) {
                return res.status(400).json({ error: 'Subscription ID is required' })
            }
            if (!newPlanId) {
                return res.status(400).json({ error: 'New plan ID is required' })
            }
            if (!prorationDate) {
                return res.status(400).json({ error: 'Proration date is required' })
            }
            const identityManager = getRunningExpressApp().identityManager
            const result = await identityManager.updateSubscriptionPlan(req, subscriptionId, newPlanId, prorationDate)

            return res.status(StatusCodes.OK).json(result)
        } catch (error) {
            next(error)
        }
    }

    public async getCurrentUsage(req: Request, res: Response, next: NextFunction) {
        try {
            const orgId = req.user?.activeOrganizationId
            const subscriptionId = req.user?.activeOrganizationSubscriptionId
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID is required' })
            }
            if (!subscriptionId) {
                return res.status(400).json({ error: 'Subscription ID is required' })
            }
            const usageCacheManager = getRunningExpressApp().usageCacheManager
            const result = await getCurrentUsage(orgId, subscriptionId, usageCacheManager)
            return res.status(StatusCodes.OK).json(result)
        } catch (error) {
            next(error)
        }
    }
}
