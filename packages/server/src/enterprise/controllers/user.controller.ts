import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { User } from '../database/entities/user.entity'
import { LoggedInUser } from '../Interface.Enterprise'
import { AccountService } from '../services/account.service'
import { UserErrorMessage, UserService } from '../services/user.service'
import { assertMayReadTargetUser } from '../utils/tenantRequestGuards'

export class UserController {
    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userService = new UserService()
            const user = await userService.createUser(req.body)
            return res.status(StatusCodes.CREATED).json(user)
        } catch (error) {
            next(error)
        }
    }

    public async read(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()

            const sessionUser = req.user as LoggedInUser | undefined
            if (!sessionUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, UserErrorMessage.USER_NOT_FOUND)
            }

            const query = req.query as Partial<User>
            const userService = new UserService()

            let user: User | null
            if (query.id) {
                await assertMayReadTargetUser(sessionUser, query.id, queryRunner)
                user = await userService.readUserById(query.id, queryRunner)
                if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            } else if (query.email) {
                const emailLc = (typeof query.email === 'string' ? query.email : '').trim().toLowerCase()
                const selfEmail = sessionUser.email?.trim().toLowerCase()
                if (!selfEmail || emailLc !== selfEmail) {
                    const byEmail = await userService.readUserByEmail(query.email, queryRunner)
                    if (!byEmail) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
                    await assertMayReadTargetUser(sessionUser, byEmail.id, queryRunner)
                    user = byEmail
                } else {
                    user = await userService.readUserByEmail(query.email, queryRunner)
                    if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
                }
            } else {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
            }

            if (user) {
                delete user.credential
                delete user.tempToken
                delete user.tokenExpiry
            }
            return res.status(StatusCodes.OK).json(user)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    public async update(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = req.user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, UserErrorMessage.USER_NOT_FOUND)
            }
            const { id } = req.body
            if (currentUser.id !== id) {
                throw new InternalFlowiseError(StatusCodes.FORBIDDEN, UserErrorMessage.USER_NOT_FOUND)
            }
            const accountService = new AccountService()
            const result = await accountService.updateAuthenticatedUserProfile(currentUser.id, req.body, (userId, newEmail) =>
                accountService.syncStripeCustomerEmailAfterUserEmailChange(userId, newEmail)
            )
            return res.status(StatusCodes.OK).json(result)
        } catch (error) {
            next(error)
        }
    }

    public async test(req: Request, res: Response, next: NextFunction) {
        try {
            return res.status(StatusCodes.OK).json({ message: 'Hello World' })
        } catch (error) {
            next(error)
        }
    }
}
