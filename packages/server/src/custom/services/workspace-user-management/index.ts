import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { CustomWorkspaceUser, CustomWorkspaceUserStatus, CustomWorkspaceUserRole } from '../../database/entities/CustomWorkspaceUser'
import { CustomWorkspace } from '../../database/entities/CustomWorkspace'
import { CustomUser } from '../../database/entities/CustomUser'
import { DataSource, QueryRunner } from 'typeorm'

export const enum CustomWorkspaceUserErrorMessage {
    INVALID_WORKSPACE_ID = 'Invalid Workspace Id',
    INVALID_USER_ID = 'Invalid User Id',
    INVALID_ROLE = 'Invalid Role',
    INVALID_STATUS = 'Invalid Status',
    WORKSPACE_NOT_FOUND = 'Workspace Not Found',
    USER_NOT_FOUND = 'User Not Found',
    WORKSPACE_USER_NOT_FOUND = 'Workspace User Not Found',
    WORKSPACE_USER_ALREADY_EXISTS = 'User Already Exists In Workspace',
    CANNOT_REMOVE_OWNER = 'Cannot Remove Workspace Owner',
    CANNOT_CHANGE_OWNER_ROLE = 'Cannot Change Owner Role',
    WORKSPACE_MUST_HAVE_OWNER = 'Workspace Must Have At Least One Owner'
}

export class CustomWorkspaceUserService {
    private dataSource: DataSource

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
    }

    public validateWorkspaceId(workspaceId: string | undefined) {
        if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceUserErrorMessage.INVALID_WORKSPACE_ID)
        }
    }

    public validateUserId(userId: string | undefined) {
        if (!userId || typeof userId !== 'string' || userId.length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceUserErrorMessage.INVALID_USER_ID)
        }
    }

    public validateRole(role: string | undefined) {
        if (role && !Object.values(CustomWorkspaceUserRole).includes(role as CustomWorkspaceUserRole)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceUserErrorMessage.INVALID_ROLE)
        }
    }

    public validateStatus(status: string | undefined) {
        if (status && !Object.values(CustomWorkspaceUserStatus).includes(status as CustomWorkspaceUserStatus)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceUserErrorMessage.INVALID_STATUS)
        }
    }

    public async readWorkspaceUser(workspaceId: string, userId: string, queryRunner: QueryRunner) {
        this.validateWorkspaceId(workspaceId)
        this.validateUserId(userId)
        return await queryRunner.manager.findOneBy(CustomWorkspaceUser, { workspaceId, userId })
    }

    public async getWorkspaceUsers(workspaceId: string, queryRunner: QueryRunner) {
        this.validateWorkspaceId(workspaceId)
        return await queryRunner.manager.find(CustomWorkspaceUser, {
            where: { workspaceId },
            order: { createdDate: 'DESC' }
        })
    }

    public async getUserWorkspaces(userId: string, queryRunner: QueryRunner) {
        this.validateUserId(userId)
        return await queryRunner.manager.find(CustomWorkspaceUser, {
            where: { userId, status: CustomWorkspaceUserStatus.ACTIVE },
            order: { createdDate: 'DESC' }
        })
    }

    public async createNewWorkspaceUser(data: Partial<CustomWorkspaceUser>, queryRunner: QueryRunner) {
        this.validateWorkspaceId(data.workspaceId)
        this.validateUserId(data.userId)

        // Check if workspace exists
        const workspace = await queryRunner.manager.findOneBy(CustomWorkspace, { id: data.workspaceId })
        if (!workspace) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomWorkspaceUserErrorMessage.WORKSPACE_NOT_FOUND)
        }

        // Check if user exists
        const user = await queryRunner.manager.findOneBy(CustomUser, { id: data.userId })
        if (!user) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomWorkspaceUserErrorMessage.USER_NOT_FOUND)
        }

        // Check if user is already in workspace
        const existingWorkspaceUser = await this.readWorkspaceUser(data.workspaceId!, data.userId!, queryRunner)
        if (existingWorkspaceUser) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceUserErrorMessage.WORKSPACE_USER_ALREADY_EXISTS)
        }

        if (data.role) this.validateRole(data.role)
        else data.role = CustomWorkspaceUserRole.MEMBER

        if (data.status) this.validateStatus(data.status)
        else data.status = CustomWorkspaceUserStatus.INVITED

        data.createdBy = data.createdBy || data.userId
        data.updatedBy = data.updatedBy || data.userId

        return queryRunner.manager.create(CustomWorkspaceUser, data)
    }

    public async saveWorkspaceUser(data: Partial<CustomWorkspaceUser>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(CustomWorkspaceUser, data)
    }

    public async addUserToWorkspace(data: Partial<CustomWorkspaceUser>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        let newWorkspaceUser = await this.createNewWorkspaceUser(data, queryRunner)
        try {
            await queryRunner.startTransaction()
            newWorkspaceUser = await this.saveWorkspaceUser(newWorkspaceUser, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return newWorkspaceUser
    }

    public async updateWorkspaceUser(workspaceId: string, userId: string, updateData: Partial<CustomWorkspaceUser>) {
        let queryRunner: QueryRunner | undefined
        let updatedWorkspaceUser: Partial<CustomWorkspaceUser>

        try {
            queryRunner = this.dataSource.createQueryRunner()
            await queryRunner.connect()

            const existingWorkspaceUser = await this.readWorkspaceUser(workspaceId, userId, queryRunner)
            if (!existingWorkspaceUser) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomWorkspaceUserErrorMessage.WORKSPACE_USER_NOT_FOUND)
            }

            // Prevent changing owner role or removing owner
            if (existingWorkspaceUser.role === CustomWorkspaceUserRole.OWNER) {
                if (updateData.role && updateData.role !== CustomWorkspaceUserRole.OWNER) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceUserErrorMessage.CANNOT_CHANGE_OWNER_ROLE)
                }
                if (updateData.status === CustomWorkspaceUserStatus.REMOVED) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceUserErrorMessage.CANNOT_REMOVE_OWNER)
                }
            }

            if (updateData.role) this.validateRole(updateData.role)
            if (updateData.status) this.validateStatus(updateData.status)

            updateData.updatedBy = updateData.updatedBy || userId

            updatedWorkspaceUser = queryRunner.manager.merge(CustomWorkspaceUser, existingWorkspaceUser, updateData)

            await queryRunner.startTransaction()
            await this.saveWorkspaceUser(updatedWorkspaceUser, queryRunner)
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

        return updatedWorkspaceUser
    }

    public async removeUserFromWorkspace(workspaceId: string, userId: string, removedBy?: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            const workspaceUser = await this.readWorkspaceUser(workspaceId, userId, queryRunner)
            if (!workspaceUser) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomWorkspaceUserErrorMessage.WORKSPACE_USER_NOT_FOUND)
            }

            // Prevent removing owner
            if (workspaceUser.role === CustomWorkspaceUserRole.OWNER) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceUserErrorMessage.CANNOT_REMOVE_OWNER)
            }

            await queryRunner.startTransaction()

            // Soft delete by updating status
            workspaceUser.status = CustomWorkspaceUserStatus.REMOVED
            workspaceUser.updatedBy = removedBy || userId
            await this.saveWorkspaceUser(workspaceUser, queryRunner)

            // Or use hard delete if preferred:
            // await queryRunner.manager.remove(CustomWorkspaceUser, workspaceUser)

            await queryRunner.commitTransaction()

            return { message: 'User removed from workspace successfully' }
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    public async changeUserRole(workspaceId: string, userId: string, newRole: CustomWorkspaceUserRole, changedBy?: string) {
        return await this.updateWorkspaceUser(workspaceId, userId, {
            role: newRole,
            updatedBy: changedBy || userId
        })
    }

    public async activateUser(workspaceId: string, userId: string, activatedBy?: string) {
        return await this.updateWorkspaceUser(workspaceId, userId, {
            status: CustomWorkspaceUserStatus.ACTIVE,
            updatedBy: activatedBy || userId
        })
    }

    public async deactivateUser(workspaceId: string, userId: string, deactivatedBy?: string) {
        return await this.updateWorkspaceUser(workspaceId, userId, {
            status: CustomWorkspaceUserStatus.DISABLED,
            updatedBy: deactivatedBy || userId
        })
    }

    public async updateLastLogin(workspaceId: string, userId: string) {
        return await this.updateWorkspaceUser(workspaceId, userId, {
            lastLogin: new Date().toISOString()
        })
    }

    public async getWorkspaceOwners(workspaceId: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            return await queryRunner.manager.find(CustomWorkspaceUser, {
                where: {
                    workspaceId,
                    role: CustomWorkspaceUserRole.OWNER,
                    status: CustomWorkspaceUserStatus.ACTIVE
                }
            })
        } finally {
            await queryRunner.release()
        }
    }

    public async getWorkspaceAdmins(workspaceId: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            return await queryRunner.manager.find(CustomWorkspaceUser, {
                where: {
                    workspaceId,
                    role: CustomWorkspaceUserRole.ADMIN,
                    status: CustomWorkspaceUserStatus.ACTIVE
                }
            })
        } finally {
            await queryRunner.release()
        }
    }

    public async getActiveWorkspaceUsers(workspaceId: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            return await queryRunner.manager.find(CustomWorkspaceUser, {
                where: {
                    workspaceId,
                    status: CustomWorkspaceUserStatus.ACTIVE
                },
                order: { createdDate: 'DESC' }
            })
        } finally {
            await queryRunner.release()
        }
    }

    public async transferOwnership(workspaceId: string, currentOwnerId: string, newOwnerId: string, transferredBy?: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            await queryRunner.startTransaction()

            // Check if current owner exists
            const currentOwner = await this.readWorkspaceUser(workspaceId, currentOwnerId, queryRunner)
            if (!currentOwner || currentOwner.role !== CustomWorkspaceUserRole.OWNER) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomWorkspaceUserErrorMessage.WORKSPACE_USER_NOT_FOUND)
            }

            // Check if new owner exists in workspace
            const newOwner = await this.readWorkspaceUser(workspaceId, newOwnerId, queryRunner)
            if (!newOwner) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomWorkspaceUserErrorMessage.WORKSPACE_USER_NOT_FOUND)
            }

            // Update current owner to admin
            currentOwner.role = CustomWorkspaceUserRole.ADMIN
            currentOwner.updatedBy = transferredBy || currentOwnerId
            await this.saveWorkspaceUser(currentOwner, queryRunner)

            // Update new owner
            newOwner.role = CustomWorkspaceUserRole.OWNER
            newOwner.status = CustomWorkspaceUserStatus.ACTIVE
            newOwner.updatedBy = transferredBy || currentOwnerId
            await this.saveWorkspaceUser(newOwner, queryRunner)

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
