import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { CustomUserService, CustomUserErrorMessage } from '../../services/user-management'
import { CustomUser } from '../../database/entities/CustomUser'
import { CustomWorkspaceUserService } from '../../services/workspace-user-management'
import { CustomOrganizationUserService } from '../../services/organization-user-management'
import { CustomOrganization, CustomOrganizationStatus } from '../../database/entities/CustomOrganization'
import { CustomWorkspace, CustomWorkspaceStatus } from '../../database/entities/CustomWorkspace'
import logger from '../../../utils/logger'

export class CustomUserController {
    public async getAllUsers(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const userService = new CustomUserService()
            const users = await userService.getAllUsers(queryRunner)
            return res.status(StatusCodes.OK).json(users)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    public async getUserById(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const { id } = req.params
            const userService = new CustomUserService()
            const user = await userService.readUserById(id, queryRunner)
            if (!user) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomUserErrorMessage.USER_NOT_FOUND)
            }

            // Remove sensitive data
            delete user.credential
            delete user.tempToken
            delete user.tokenExpiry
            return res.status(StatusCodes.OK).json(user)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    //TODO 라우팅 문제로 사용자 등록 시 이 함수 호툴이 안됨.
    public async createUser(req: Request, res: Response, next: NextFunction) {
        logger.info('🚀 CustomUserController.createUser called with body:', req.body)
        const queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
        try {
            const userService = new CustomUserService()
            const workspaceUserService = new CustomWorkspaceUserService()
            const organizationUserService = new CustomOrganizationUserService()
            const userData = req.body as Partial<CustomUser> & { password?: string }

            await queryRunner.connect()
            await queryRunner.startTransaction()

            // Convert password to credential for service
            if (userData.password) {
                userData.credential = userData.password
                delete userData.password
            }

            // Create user with shared queryRunner
            logger.info('📝 Creating user...')
            const newUser = await userService.createNewUser(userData, queryRunner)
            await userService.saveUser(newUser, queryRunner)
            logger.info('✅ User created:', newUser.id)

            // Create default organization if not exists
            let defaultOrganization = await queryRunner.manager.findOneBy(CustomOrganization, {
                name: 'Default Organization'
            })
            if (!defaultOrganization) {
                const { generateId } = await import('../../../utils')
                defaultOrganization = queryRunner.manager.create(CustomOrganization, {
                    id: generateId(),
                    name: 'Default Organization',
                    description: 'Default organization for all users',
                    status: CustomOrganizationStatus.ACTIVE,
                    createdBy: newUser.id,
                    updatedBy: newUser.id
                })
                await queryRunner.manager.save(CustomOrganization, defaultOrganization)
            }

            // Create default workspace if not exists
            let defaultWorkspace = await queryRunner.manager.findOneBy(CustomWorkspace, {
                name: 'Default Workspace'
            })
            if (!defaultWorkspace) {
                const { generateId } = await import('../../../utils')
                defaultWorkspace = queryRunner.manager.create(CustomWorkspace, {
                    id: generateId(),
                    name: 'Default Workspace',
                    description: 'Default workspace for all users',
                    status: CustomWorkspaceStatus.ACTIVE,
                    organizationId: defaultOrganization.id,
                    createdBy: newUser.id,
                    updatedBy: newUser.id
                })
                await queryRunner.manager.save(CustomWorkspace, defaultWorkspace)
            }

            // Get default role ID
            const defaultRole = await queryRunner.query(`SELECT id FROM role WHERE name = 'member' OR name = 'Member' LIMIT 1`)
            const roleId = defaultRole?.[0]?.id || null

            // Add user to default workspace (using raw query to ensure insertion)
            await queryRunner.query(
                `
                INSERT INTO workspace_user (workspaceId, userId, roleId, status, lastLogin, createdDate, updatedDate, createdBy, updatedBy)
                VALUES ($1, $2, $3, $4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5, $6)
                ON CONFLICT (workspaceId, userId) DO NOTHING
            `,
                [defaultWorkspace.id, newUser.id, roleId, 'active', newUser.id, newUser.id]
            )

            // Add user to default organization (using raw query to ensure insertion)
            await queryRunner.query(
                `
                INSERT INTO organization_user (organizationId, userId, roleId, status, createdDate, updatedDate, createdBy, updatedBy)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5, $6)
                ON CONFLICT (organizationId, userId) DO NOTHING
            `,
                [defaultOrganization.id, newUser.id, roleId, 'active', newUser.id, newUser.id]
            )

            await queryRunner.commitTransaction()
            logger.info('🎉 Transaction committed successfully!')

            // Remove sensitive data before returning
            delete newUser.credential
            delete newUser.tempToken

            return res.status(StatusCodes.CREATED).json(newUser)
        } catch (error) {
            logger.error('Error creating user:', error)
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            next(error)
        } finally {
            if (queryRunner && !queryRunner.isReleased) {
                await queryRunner.release()
            }
        }
    }

    public async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const userService = new CustomUserService()
            const userData = { ...req.body, id } as Partial<CustomUser> & { password?: string }
            const updatedUser = await userService.updateUser(userData)
            return res.status(StatusCodes.OK).json(updatedUser)
        } catch (error) {
            next(error)
        }
    }

    public async deleteUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const userService = new CustomUserService()
            const result = await userService.deleteUser(id)
            return res.status(StatusCodes.OK).json(result)
        } catch (error) {
            next(error)
        }
    }
}
