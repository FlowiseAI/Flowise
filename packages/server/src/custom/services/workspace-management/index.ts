import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { CustomWorkspace, CustomWorkspaceStatus } from '../../database/entities/CustomWorkspace'
import { DataSource, QueryRunner } from 'typeorm'
import { generateId } from '../../../utils'

export const enum CustomWorkspaceErrorMessage {
    INVALID_WORKSPACE_ID = 'Invalid Workspace Id',
    INVALID_WORKSPACE_NAME = 'Invalid Workspace Name',
    INVALID_WORKSPACE_STATUS = 'Invalid Workspace Status',
    WORKSPACE_NAME_ALREADY_EXISTS = 'Workspace Name Already Exists',
    WORKSPACE_NOT_FOUND = 'Workspace Not Found',
    WORKSPACE_FOUND_MULTIPLE = 'Workspace Found Multiple',
    WORKSPACE_CANNOT_DELETE_DEFAULT = 'Cannot Delete Default Workspace'
}

export class CustomWorkspaceService {
    private dataSource: DataSource

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
    }

    public validateWorkspaceId(id: string | undefined) {
        if (!id || typeof id !== 'string' || id.length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceErrorMessage.INVALID_WORKSPACE_ID)
        }
    }

    public async readWorkspaceById(id: string | undefined, queryRunner: QueryRunner) {
        this.validateWorkspaceId(id)
        return await queryRunner.manager.findOneBy(CustomWorkspace, { id })
    }

    public validateWorkspaceName(name: string | undefined) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceErrorMessage.INVALID_WORKSPACE_NAME)
        }
    }

    public async readWorkspaceByName(name: string | undefined, queryRunner: QueryRunner) {
        this.validateWorkspaceName(name)
        return await queryRunner.manager.findOneBy(CustomWorkspace, { name })
    }

    public validateWorkspaceStatus(status: string | undefined) {
        if (status && !Object.values(CustomWorkspaceStatus).includes(status as CustomWorkspaceStatus)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceErrorMessage.INVALID_WORKSPACE_STATUS)
        }
    }

    public async getAllWorkspaces(queryRunner: QueryRunner) {
        return await queryRunner.manager.find(CustomWorkspace, {
            select: ['id', 'name', 'description', 'status', 'organizationId', 'createdDate', 'updatedDate'],
            order: { createdDate: 'DESC' }
        })
    }

    public async getWorkspacesByStatus(status: CustomWorkspaceStatus, queryRunner: QueryRunner) {
        this.validateWorkspaceStatus(status)
        return await queryRunner.manager.find(CustomWorkspace, {
            where: { status },
            select: ['id', 'name', 'description', 'status', 'organizationId', 'createdDate', 'updatedDate'],
            order: { createdDate: 'DESC' }
        })
    }

    public async createNewWorkspace(data: Partial<CustomWorkspace>, queryRunner: QueryRunner) {
        // Check if workspace name already exists
        if (data.name) {
            const existingWorkspace = await this.readWorkspaceByName(data.name, queryRunner)
            if (existingWorkspace) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceErrorMessage.WORKSPACE_NAME_ALREADY_EXISTS)
            }
        }

        this.validateWorkspaceName(data.name)

        if (data.status) this.validateWorkspaceStatus(data.status)
        else data.status = CustomWorkspaceStatus.ACTIVE

        data.id = generateId()
        data.createdBy = data.createdBy || data.id
        data.updatedBy = data.updatedBy || data.id

        return queryRunner.manager.create(CustomWorkspace, data)
    }

    public async saveWorkspace(data: Partial<CustomWorkspace>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(CustomWorkspace, data)
    }

    public async createWorkspace(data: Partial<CustomWorkspace>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        let newWorkspace = await this.createNewWorkspace(data, queryRunner)
        try {
            await queryRunner.startTransaction()
            newWorkspace = await this.saveWorkspace(newWorkspace, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return newWorkspace
    }

    public async updateWorkspace(workspaceData: Partial<CustomWorkspace>) {
        let queryRunner: QueryRunner | undefined
        let updatedWorkspace: Partial<CustomWorkspace>

        try {
            queryRunner = this.dataSource.createQueryRunner()
            await queryRunner.connect()

            const existingWorkspace = await this.readWorkspaceById(workspaceData.id, queryRunner)
            if (!existingWorkspace) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomWorkspaceErrorMessage.WORKSPACE_NOT_FOUND)
            }

            if (workspaceData.name && workspaceData.name !== existingWorkspace.name) {
                this.validateWorkspaceName(workspaceData.name)
                const existingNameWorkspace = await this.readWorkspaceByName(workspaceData.name, queryRunner)
                if (existingNameWorkspace && existingNameWorkspace.id !== workspaceData.id) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceErrorMessage.WORKSPACE_NAME_ALREADY_EXISTS)
                }
            }

            if (workspaceData.status) {
                this.validateWorkspaceStatus(workspaceData.status)
            }

            workspaceData.updatedBy = workspaceData.updatedBy || existingWorkspace.id

            updatedWorkspace = queryRunner.manager.merge(CustomWorkspace, existingWorkspace, workspaceData)

            await queryRunner.startTransaction()
            await this.saveWorkspace(updatedWorkspace, queryRunner)
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

        return updatedWorkspace
    }

    public async deleteWorkspace(id: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            const workspace = await this.readWorkspaceById(id, queryRunner)
            if (!workspace) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomWorkspaceErrorMessage.WORKSPACE_NOT_FOUND)
            }

            // Check if it's a default workspace (you might want to prevent deletion)
            if (workspace.name === 'Default Workspace' || workspace.name === 'Personal Workspace') {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomWorkspaceErrorMessage.WORKSPACE_CANNOT_DELETE_DEFAULT)
            }

            await queryRunner.startTransaction()

            // Soft delete by updating status instead of hard delete
            workspace.status = CustomWorkspaceStatus.DELETED
            workspace.updatedBy = workspace.id
            await this.saveWorkspace(workspace, queryRunner)

            // Or use hard delete if preferred:
            // await queryRunner.manager.remove(CustomWorkspace, workspace)

            await queryRunner.commitTransaction()

            return { message: 'Workspace deleted successfully' }
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    public async getWorkspacesByUser(userId: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            // This would require a WorkspaceUser entity/table to track user-workspace relationships
            // For now, return workspaces created by the user
            return await queryRunner.manager.find(CustomWorkspace, {
                where: { createdBy: userId, status: CustomWorkspaceStatus.ACTIVE },
                select: ['id', 'name', 'description', 'status', 'organizationId', 'createdDate', 'updatedDate'],
                order: { createdDate: 'DESC' }
            })
        } finally {
            await queryRunner.release()
        }
    }

    public async activateWorkspace(id: string) {
        return await this.updateWorkspace({ id, status: CustomWorkspaceStatus.ACTIVE })
    }

    public async deactivateWorkspace(id: string) {
        return await this.updateWorkspace({ id, status: CustomWorkspaceStatus.INACTIVE })
    }
}
