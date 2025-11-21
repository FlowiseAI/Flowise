import { StatusCodes } from 'http-status-codes'
import { DataSource, EntityManager, In, IsNull, QueryRunner, UpdateResult } from 'typeorm'
import { ApiKey } from '../../database/entities/ApiKey'
import { Assistant } from '../../database/entities/Assistant'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { Credential } from '../../database/entities/Credential'
import { CustomTemplate } from '../../database/entities/CustomTemplate'
import { Dataset } from '../../database/entities/Dataset'
import { DatasetRow } from '../../database/entities/DatasetRow'
import { DocumentStore } from '../../database/entities/DocumentStore'
import { DocumentStoreFileChunk } from '../../database/entities/DocumentStoreFileChunk'
import { Evaluation } from '../../database/entities/Evaluation'
import { EvaluationRun } from '../../database/entities/EvaluationRun'
import { Evaluator } from '../../database/entities/Evaluator'
import { Execution } from '../../database/entities/Execution'
import { Tool } from '../../database/entities/Tool'
import { UpsertHistory } from '../../database/entities/UpsertHistory'
import { Variable } from '../../database/entities/Variable'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { generateId } from '../../utils'
import { GeneralSuccessMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { WorkspaceShared } from '../database/entities/EnterpriseEntities'
import { GeneralRole } from '../database/entities/role.entity'
import { WorkspaceUser } from '../database/entities/workspace-user.entity'
import { Workspace, WorkspaceName } from '../database/entities/workspace.entity'
import { isInvalidName, isInvalidUUID } from '../utils/validation.util'
import { OrganizationErrorMessage, OrganizationService } from './organization.service'
import { RoleErrorMessage, RoleService } from './role.service'
import { UserErrorMessage, UserService } from './user.service'

export const enum WorkspaceErrorMessage {
    INVALID_WORKSPACE_ID = 'Invalid Workspace Id',
    INVALID_WORKSPACE_NAME = 'Invalid Workspace Name',
    WORKSPACE_NOT_FOUND = 'Workspace Not Found',
    WORKSPACE_RESERVERD_NAME = 'Workspace name cannot be Default Workspace or Personal Workspace - this is a reserved name'
}

export class WorkspaceService {
    private dataSource: DataSource
    private userService: UserService
    private organizationService: OrganizationService
    private roleService: RoleService

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
        this.userService = new UserService()
        this.organizationService = new OrganizationService()
        this.roleService = new RoleService()
    }

    public validateWorkspaceId(id: string | undefined) {
        if (isInvalidUUID(id)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WorkspaceErrorMessage.INVALID_WORKSPACE_ID)
    }

    public async readWorkspaceById(id: string | undefined, queryRunner: QueryRunner) {
        this.validateWorkspaceId(id)
        return await queryRunner.manager.findOneBy(Workspace, { id })
    }

    public validateWorkspaceName(name: string | undefined, isRegister: boolean = false) {
        if (isInvalidName(name)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WorkspaceErrorMessage.INVALID_WORKSPACE_NAME)
        if (!isRegister && (name === WorkspaceName.DEFAULT_PERSONAL_WORKSPACE || name === WorkspaceName.DEFAULT_WORKSPACE)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WorkspaceErrorMessage.WORKSPACE_RESERVERD_NAME)
        }
    }

    public async readWorkspaceByOrganizationId(organizationId: string | undefined, queryRunner: QueryRunner) {
        await this.organizationService.readOrganizationById(organizationId, queryRunner)
        const workspaces = await queryRunner.manager.findBy(Workspace, { organizationId })

        const rolePersonalWorkspace = await this.roleService.readGeneralRoleByName(GeneralRole.PERSONAL_WORKSPACE, queryRunner)
        if (!rolePersonalWorkspace) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)

        const filteredWorkspaces = await Promise.all(
            workspaces.map(async (workspace) => {
                const workspaceUsers = await queryRunner.manager.findBy(WorkspaceUser, { workspaceId: workspace.id })

                // Skip if any user in the workspace has PERSONAL_WORKSPACE role
                const hasPersonalWorkspaceUser = workspaceUsers.some((user) => user.roleId === rolePersonalWorkspace.id)
                if (hasPersonalWorkspaceUser) {
                    return null
                }

                return {
                    ...workspace,
                    userCount: workspaceUsers.length
                } as Workspace & { userCount: number }
            })
        )

        // Filter out null values (personal workspaces)
        return filteredWorkspaces.filter((workspace): workspace is Workspace & { userCount: number } => workspace !== null)
    }

    public createNewWorkspace(data: Partial<Workspace>, queryRunner: QueryRunner, isRegister: boolean = false) {
        this.validateWorkspaceName(data.name, isRegister)
        data.updatedBy = data.createdBy
        data.id = generateId()

        return queryRunner.manager.create(Workspace, data)
    }

    public async saveWorkspace(data: Partial<Workspace>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(Workspace, data)
    }

    public async createWorkspace(data: Partial<Workspace>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const organization = await this.organizationService.readOrganizationById(data.organizationId, queryRunner)
        if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
        const user = await this.userService.readUserById(data.createdBy, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

        let newWorkspace = this.createNewWorkspace(data, queryRunner)
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

    public async updateWorkspace(newWorkspaceData: Partial<Workspace>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const oldWorkspaceData = await this.readWorkspaceById(newWorkspaceData.id, queryRunner)
        if (!oldWorkspaceData) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceErrorMessage.WORKSPACE_NOT_FOUND)
        const user = await this.userService.readUserById(newWorkspaceData.updatedBy, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        if (newWorkspaceData.name) {
            this.validateWorkspaceName(newWorkspaceData.name)
        }
        newWorkspaceData.organizationId = oldWorkspaceData.organizationId
        newWorkspaceData.createdBy = oldWorkspaceData.createdBy

        let updateWorkspace = queryRunner.manager.merge(Workspace, oldWorkspaceData, newWorkspaceData)
        try {
            await queryRunner.startTransaction()
            updateWorkspace = await this.saveWorkspace(updateWorkspace, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return updateWorkspace
    }

    public async deleteWorkspaceById(queryRunner: QueryRunner, workspaceId: string) {
        const workspace = await this.readWorkspaceById(workspaceId, queryRunner)
        if (!workspace) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceErrorMessage.WORKSPACE_NOT_FOUND)

        // First get all related entities that need to be deleted
        const chatflows = await queryRunner.manager.findBy(ChatFlow, { workspaceId })
        const documentStores = await queryRunner.manager.findBy(DocumentStore, { workspaceId })
        const evaluations = await queryRunner.manager.findBy(Evaluation, { workspaceId })
        const datasets = await queryRunner.manager.findBy(Dataset, { workspaceId })

        // Extract IDs for bulk deletion
        const chatflowIds = chatflows.map((cf) => cf.id)
        const documentStoreIds = documentStores.map((ds) => ds.id)
        const evaluationIds = evaluations.map((e) => e.id)
        const datasetIds = datasets.map((d) => d.id)

        // Start deleting in the correct order to maintain referential integrity
        await queryRunner.manager.delete(WorkspaceUser, { workspaceId })
        await queryRunner.manager.delete(ApiKey, { workspaceId })
        await queryRunner.manager.delete(Assistant, { workspaceId })
        await queryRunner.manager.delete(Execution, { workspaceId })

        // Delete chatflow related entities
        if (chatflowIds.length > 0) {
            await queryRunner.manager.delete(ChatFlow, { workspaceId })
            await queryRunner.manager.delete(ChatMessageFeedback, { chatflowid: In(chatflowIds) })
            await queryRunner.manager.delete(ChatMessage, { chatflowid: In(chatflowIds) })
            await queryRunner.manager.delete(UpsertHistory, { chatflowid: In(chatflowIds) })
        }

        await queryRunner.manager.delete(Credential, { workspaceId })
        await queryRunner.manager.delete(CustomTemplate, { workspaceId })

        // Delete dataset related entities
        if (datasetIds.length > 0) {
            await queryRunner.manager.delete(Dataset, { workspaceId })
            await queryRunner.manager.delete(DatasetRow, { datasetId: In(datasetIds) })
        }

        // Delete document store related entities
        if (documentStoreIds.length > 0) {
            await queryRunner.manager.delete(DocumentStore, { workspaceId })
            await queryRunner.manager.delete(DocumentStoreFileChunk, { storeId: In(documentStoreIds) })
        }

        // Delete evaluation related entities
        if (evaluationIds.length > 0) {
            await queryRunner.manager.delete(Evaluation, { workspaceId })
            await queryRunner.manager.delete(EvaluationRun, { evaluationId: In(evaluationIds) })
        }

        await queryRunner.manager.delete(Evaluator, { workspaceId })
        await queryRunner.manager.delete(Tool, { workspaceId })
        await queryRunner.manager.delete(Variable, { workspaceId })
        await queryRunner.manager.delete(WorkspaceShared, { workspaceId })

        // Finally delete the workspace itself
        await queryRunner.manager.delete(Workspace, { id: workspaceId })

        return workspace
    }

    public async getSharedWorkspacesForItem(itemId: string) {
        const sharedWorkspaces = await this.dataSource.getRepository(WorkspaceShared).find({
            where: {
                sharedItemId: itemId
            }
        })
        if (sharedWorkspaces.length === 0) {
            return []
        }

        const workspaceIds = sharedWorkspaces.map((ws) => ws.workspaceId)
        const workspaces = await this.dataSource.getRepository(Workspace).find({
            select: ['id', 'name'],
            where: { id: In(workspaceIds) }
        })

        return sharedWorkspaces.map((sw) => {
            const workspace = workspaces.find((w) => w.id === sw.workspaceId)
            return {
                workspaceId: sw.workspaceId,
                workspaceName: workspace?.name,
                sharedItemId: sw.sharedItemId,
                itemType: sw.itemType
            }
        })
    }

    public async getSharedItemsForWorkspace(wsId: string, itemType: string) {
        const sharedItems = await this.dataSource.getRepository(WorkspaceShared).find({
            where: {
                workspaceId: wsId,
                itemType: itemType
            }
        })
        if (sharedItems.length === 0) {
            return []
        }

        const itemIds = sharedItems.map((item) => item.sharedItemId)
        if (itemType === 'credential') {
            return await this.dataSource.getRepository(Credential).find({
                select: ['id', 'name', 'credentialName', 'createdDate', 'updatedDate', 'workspaceId'],
                where: { id: In(itemIds) }
            })
        } else if (itemType === 'custom_template') {
            return await this.dataSource.getRepository(CustomTemplate).find({
                where: { id: In(itemIds) }
            })
        }
        return []
    }

    public async setSharedWorkspacesForItem(itemId: string, body: { itemType: string; workspaceIds: string[] }) {
        const { itemType, workspaceIds } = body

        await this.dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
            // Delete existing shared workspaces for the item
            await transactionalEntityManager.getRepository(WorkspaceShared).delete({
                sharedItemId: itemId
            })

            // Add new shared workspaces
            const sharedWorkspaces = workspaceIds.map((workspaceId) =>
                transactionalEntityManager.getRepository(WorkspaceShared).create({
                    workspaceId,
                    sharedItemId: itemId,
                    itemType
                })
            )
            await transactionalEntityManager.getRepository(WorkspaceShared).save(sharedWorkspaces)
        })

        return { message: GeneralSuccessMessage.UPDATED }
    }

    /**
     * Updates all entities with null workspaceId to the specified workspaceId
     * Used for migrating legacy data that was created before workspace implementation
     * This function is guaranteed to return meaningful results with affected row counts
     * @param queryRunner The TypeORM query runner to execute database operations
     * @param workspaceId The target workspaceId to assign to records with null workspaceId
     * @returns An array of update results, each containing the count of affected rows.
     * The array will always contain results for each entity type in the following order:
     * [ApiKey, Assistant, ChatFlow, Credential, CustomTemplate, Dataset, DocumentStore, Evaluation, Evaluator, Tool, Variable]
     */
    public async setNullWorkspaceId(queryRunner: QueryRunner, workspaceId: string): Promise<UpdateResult[]> {
        return await Promise.all([
            queryRunner.manager.update(ApiKey, { workspaceId: IsNull() }, { workspaceId }),
            queryRunner.manager.update(Assistant, { workspaceId: IsNull() }, { workspaceId }),
            queryRunner.manager.update(ChatFlow, { workspaceId: IsNull() }, { workspaceId }),
            queryRunner.manager.update(Credential, { workspaceId: IsNull() }, { workspaceId }),
            queryRunner.manager.update(CustomTemplate, { workspaceId: IsNull() }, { workspaceId }),
            queryRunner.manager.update(Dataset, { workspaceId: IsNull() }, { workspaceId }),
            queryRunner.manager.update(DocumentStore, { workspaceId: IsNull() }, { workspaceId }),
            queryRunner.manager.update(Evaluation, { workspaceId: IsNull() }, { workspaceId }),
            queryRunner.manager.update(Evaluator, { workspaceId: IsNull() }, { workspaceId }),
            queryRunner.manager.update(Execution, { workspaceId: IsNull() }, { workspaceId }),
            queryRunner.manager.update(Tool, { workspaceId: IsNull() }, { workspaceId }),
            queryRunner.manager.update(Variable, { workspaceId: IsNull() }, { workspaceId })
        ])
    }
}
