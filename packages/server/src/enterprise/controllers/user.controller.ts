import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { User } from '../database/entities/user.entity'
import { UserErrorMessage, UserService } from '../services/user.service'

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
            const query = req.query as Partial<User>
            const userService = new UserService()

            let user: User | null
            if (query.id) {
                user = await userService.readUserById(query.id, queryRunner)
                if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            } else if (query.email) {
                user = await userService.readUserByEmail(query.email, queryRunner)
                if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
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
            const userService = new UserService()
            const currentUser = req.user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, UserErrorMessage.USER_NOT_FOUND)
            }
            const { id } = req.body
            if (currentUser.id !== id) {
                throw new InternalFlowiseError(StatusCodes.FORBIDDEN, UserErrorMessage.USER_NOT_FOUND)
            }
            const user = await userService.updateUser(req.body)
            return res.status(StatusCodes.OK).json(user)
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
