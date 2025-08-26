import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { LoginActivityService } from '../services/LoginActivityService'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

export class LoginActivityController {
    public async getUserActivity(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()

            const { username } = req.params
            const limit = parseInt(req.query.limit as string) || 50

            const loginActivityService = new LoginActivityService(queryRunner)
            const activities = await loginActivityService.getActivityByUsername(username, limit)

            return res.status(StatusCodes.OK).json(activities)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    public async getRecentActivity(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()

            const limit = parseInt(req.query.limit as string) || 100

            const loginActivityService = new LoginActivityService(queryRunner)
            const activities = await loginActivityService.getRecentActivity(limit)

            return res.status(StatusCodes.OK).json(activities)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    public async getFailedAttempts(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()

            const { username } = req.params
            const hours = parseInt(req.query.hours as string) || 24

            const loginActivityService = new LoginActivityService(queryRunner)
            const activities = await loginActivityService.getFailedLoginAttempts(username, hours)

            return res.status(StatusCodes.OK).json(activities)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }
}
