import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import {
    CustomOrganizationUser,
    CustomOrganizationUserStatus,
    CustomOrganizationUserRole
} from '../../database/entities/CustomOrganizationUser'
import { CustomOrganization } from '../../database/entities/CustomOrganization'
import { CustomUser } from '../../database/entities/CustomUser'
import { DataSource, QueryRunner } from 'typeorm'

export const enum CustomOrganizationUserErrorMessage {
    INVALID_ORGANIZATION_ID = 'Invalid Organization Id',
    INVALID_USER_ID = 'Invalid User Id',
    INVALID_ROLE = 'Invalid Role',
    INVALID_STATUS = 'Invalid Status',
    ORGANIZATION_NOT_FOUND = 'Organization Not Found',
    USER_NOT_FOUND = 'User Not Found',
    ORGANIZATION_USER_NOT_FOUND = 'Organization User Not Found',
    ORGANIZATION_USER_ALREADY_EXISTS = 'User Already Exists In Organization',
    CANNOT_REMOVE_OWNER = 'Cannot Remove Organization Owner',
    CANNOT_CHANGE_OWNER_ROLE = 'Cannot Change Owner Role',
    ORGANIZATION_MUST_HAVE_OWNER = 'Organization Must Have At Least One Owner'
}

export class CustomOrganizationUserService {
    private dataSource: DataSource

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
    }

    public validateOrganizationId(organizationId: string | undefined) {
        if (!organizationId || typeof organizationId !== 'string' || organizationId.length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationUserErrorMessage.INVALID_ORGANIZATION_ID)
        }
    }

    public validateUserId(userId: string | undefined) {
        if (!userId || typeof userId !== 'string' || userId.length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationUserErrorMessage.INVALID_USER_ID)
        }
    }

    public validateRole(role: string | undefined) {
        if (role && !Object.values(CustomOrganizationUserRole).includes(role as CustomOrganizationUserRole)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationUserErrorMessage.INVALID_ROLE)
        }
    }

    public validateStatus(status: string | undefined) {
        if (status && !Object.values(CustomOrganizationUserStatus).includes(status as CustomOrganizationUserStatus)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationUserErrorMessage.INVALID_STATUS)
        }
    }

    public async readOrganizationUser(organizationId: string, userId: string, queryRunner: QueryRunner) {
        this.validateOrganizationId(organizationId)
        this.validateUserId(userId)
        return await queryRunner.manager.findOneBy(CustomOrganizationUser, { organizationId, userId })
    }

    public async getOrganizationUsers(organizationId: string, queryRunner: QueryRunner) {
        this.validateOrganizationId(organizationId)
        return await queryRunner.manager.find(CustomOrganizationUser, {
            where: { organizationId },
            order: { createdDate: 'DESC' }
        })
    }

    public async getUserOrganizations(userId: string, queryRunner: QueryRunner) {
        this.validateUserId(userId)
        return await queryRunner.manager.find(CustomOrganizationUser, {
            where: { userId, status: CustomOrganizationUserStatus.ACTIVE },
            order: { createdDate: 'DESC' }
        })
    }

    public async createNewOrganizationUser(data: Partial<CustomOrganizationUser>, queryRunner: QueryRunner) {
        this.validateOrganizationId(data.organizationId)
        this.validateUserId(data.userId)

        // Check if organization exists
        const organization = await queryRunner.manager.findOneBy(CustomOrganization, { id: data.organizationId })
        if (!organization) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomOrganizationUserErrorMessage.ORGANIZATION_NOT_FOUND)
        }

        // Check if user exists
        const user = await queryRunner.manager.findOneBy(CustomUser, { id: data.userId })
        if (!user) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomOrganizationUserErrorMessage.USER_NOT_FOUND)
        }

        // Check if user is already in organization
        const existingOrganizationUser = await this.readOrganizationUser(data.organizationId!, data.userId!, queryRunner)
        if (existingOrganizationUser) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationUserErrorMessage.ORGANIZATION_USER_ALREADY_EXISTS)
        }

        if (data.role) this.validateRole(data.role)
        else data.role = CustomOrganizationUserRole.MEMBER

        if (data.status) this.validateStatus(data.status)
        else data.status = CustomOrganizationUserStatus.INVITED

        data.createdBy = data.createdBy || data.userId
        data.updatedBy = data.updatedBy || data.userId

        return queryRunner.manager.create(CustomOrganizationUser, data)
    }

    public async saveOrganizationUser(data: Partial<CustomOrganizationUser>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(CustomOrganizationUser, data)
    }

    public async addUserToOrganization(data: Partial<CustomOrganizationUser>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        let newOrganizationUser = await this.createNewOrganizationUser(data, queryRunner)
        try {
            await queryRunner.startTransaction()
            newOrganizationUser = await this.saveOrganizationUser(newOrganizationUser, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return newOrganizationUser
    }

    public async updateOrganizationUser(organizationId: string, userId: string, updateData: Partial<CustomOrganizationUser>) {
        let queryRunner: QueryRunner | undefined
        let updatedOrganizationUser: Partial<CustomOrganizationUser>

        try {
            queryRunner = this.dataSource.createQueryRunner()
            await queryRunner.connect()

            const existingOrganizationUser = await this.readOrganizationUser(organizationId, userId, queryRunner)
            if (!existingOrganizationUser) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomOrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
            }

            // Prevent changing owner role or removing owner
            if (existingOrganizationUser.role === CustomOrganizationUserRole.OWNER) {
                if (updateData.role && updateData.role !== CustomOrganizationUserRole.OWNER) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationUserErrorMessage.CANNOT_CHANGE_OWNER_ROLE)
                }
                if (updateData.status === CustomOrganizationUserStatus.REMOVED) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationUserErrorMessage.CANNOT_REMOVE_OWNER)
                }
            }

            if (updateData.role) this.validateRole(updateData.role)
            if (updateData.status) this.validateStatus(updateData.status)

            updateData.updatedBy = updateData.updatedBy || userId

            updatedOrganizationUser = queryRunner.manager.merge(CustomOrganizationUser, existingOrganizationUser, updateData)

            await queryRunner.startTransaction()
            await this.saveOrganizationUser(updatedOrganizationUser, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            if (queryRunner && !queryRunner.isReleased) {
                await queryRunner.release()
            }
        }

        return updatedOrganizationUser
    }

    public async removeUserFromOrganization(organizationId: string, userId: string, removedBy?: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            const organizationUser = await this.readOrganizationUser(organizationId, userId, queryRunner)
            if (!organizationUser) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomOrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
            }

            // Prevent removing owner
            if (organizationUser.role === CustomOrganizationUserRole.OWNER) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationUserErrorMessage.CANNOT_REMOVE_OWNER)
            }

            await queryRunner.startTransaction()

            // Soft delete by updating status
            organizationUser.status = CustomOrganizationUserStatus.REMOVED
            organizationUser.updatedBy = removedBy || userId
            await this.saveOrganizationUser(organizationUser, queryRunner)

            await queryRunner.commitTransaction()

            return { message: 'User removed from organization successfully' }
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    public async changeUserRole(organizationId: string, userId: string, newRole: CustomOrganizationUserRole, changedBy?: string) {
        return await this.updateOrganizationUser(organizationId, userId, {
            role: newRole,
            updatedBy: changedBy || userId
        })
    }

    public async activateUser(organizationId: string, userId: string, activatedBy?: string) {
        return await this.updateOrganizationUser(organizationId, userId, {
            status: CustomOrganizationUserStatus.ACTIVE,
            updatedBy: activatedBy || userId
        })
    }

    public async deactivateUser(organizationId: string, userId: string, deactivatedBy?: string) {
        return await this.updateOrganizationUser(organizationId, userId, {
            status: CustomOrganizationUserStatus.DISABLED,
            updatedBy: deactivatedBy || userId
        })
    }

    public async getOrganizationOwners(organizationId: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            return await queryRunner.manager.find(CustomOrganizationUser, {
                where: {
                    organizationId,
                    role: CustomOrganizationUserRole.OWNER,
                    status: CustomOrganizationUserStatus.ACTIVE
                }
            })
        } finally {
            await queryRunner.release()
        }
    }

    public async getOrganizationAdmins(organizationId: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            return await queryRunner.manager.find(CustomOrganizationUser, {
                where: {
                    organizationId,
                    role: CustomOrganizationUserRole.ADMIN,
                    status: CustomOrganizationUserStatus.ACTIVE
                }
            })
        } finally {
            await queryRunner.release()
        }
    }

    public async getActiveOrganizationUsers(organizationId: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            return await queryRunner.manager.find(CustomOrganizationUser, {
                where: {
                    organizationId,
                    status: CustomOrganizationUserStatus.ACTIVE
                },
                order: { createdDate: 'DESC' }
            })
        } finally {
            await queryRunner.release()
        }
    }

    public async transferOwnership(organizationId: string, currentOwnerId: string, newOwnerId: string, transferredBy?: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            await queryRunner.startTransaction()

            // Check if current owner exists
            const currentOwner = await this.readOrganizationUser(organizationId, currentOwnerId, queryRunner)
            if (!currentOwner || currentOwner.role !== CustomOrganizationUserRole.OWNER) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomOrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
            }

            // Check if new owner exists in organization
            const newOwner = await this.readOrganizationUser(organizationId, newOwnerId, queryRunner)
            if (!newOwner) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomOrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
            }

            // Update current owner to admin
            currentOwner.role = CustomOrganizationUserRole.ADMIN
            currentOwner.updatedBy = transferredBy || currentOwnerId
            await this.saveOrganizationUser(currentOwner, queryRunner)

            // Update new owner
            newOwner.role = CustomOrganizationUserRole.OWNER
            newOwner.status = CustomOrganizationUserStatus.ACTIVE
            newOwner.updatedBy = transferredBy || currentOwnerId
            await this.saveOrganizationUser(newOwner, queryRunner)

            await queryRunner.commitTransaction()

            return { message: 'Ownership transferred successfully' }
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            await queryRunner.release()
        }
    }
}
