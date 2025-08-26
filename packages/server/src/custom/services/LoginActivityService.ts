import { Repository, QueryRunner } from 'typeorm'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { LoginActivity } from '../database/entities/LoginActivity'

export enum LoginActivityCode {
    LOGIN_SUCCESS = 1,
    LOGIN_FAILED = 2,
    LOGOUT = 3,
    SESSION_EXPIRED = 4,
    PASSWORD_RESET = 5
}

export interface LoginActivityLog {
    username: string
    activityCode: LoginActivityCode
    message: string
    loginMode?: string
}

export class LoginActivityService {
    private repository: Repository<LoginActivity>

    constructor(queryRunner?: QueryRunner) {
        if (queryRunner) {
            this.repository = queryRunner.manager.getRepository(LoginActivity)
        } else {
            this.repository = getRunningExpressApp().AppDataSource.getRepository(LoginActivity)
        }
    }

    async logActivity(activityData: LoginActivityLog): Promise<LoginActivity> {
        console.log('📝 LoginActivityService.logActivity called with:', activityData)
        
        const activity = new LoginActivity()
        activity.username = activityData.username
        activity.activityCode = activityData.activityCode
        activity.message = activityData.message
        activity.loginMode = activityData.loginMode

        console.log('📝 Activity object before save:', activity)
        
        try {
            const result = await this.repository.save(activity)
            console.log('📝 Activity saved successfully:', result)
            return result
        } catch (error) {
            console.error('📝 Error saving activity:', error)
            throw error
        }
    }

    async getActivityByUsername(username: string, limit: number = 50): Promise<LoginActivity[]> {
        return await this.repository.find({
            where: { username },
            order: { attemptedDateTime: 'DESC' },
            take: limit
        })
    }

    async getRecentActivity(limit: number = 100): Promise<LoginActivity[]> {
        return await this.repository.find({
            order: { attemptedDateTime: 'DESC' },
            take: limit
        })
    }

    async getFailedLoginAttempts(username: string, hours: number = 24): Promise<LoginActivity[]> {
        const fromDate = new Date()
        fromDate.setHours(fromDate.getHours() - hours)

        return await this.repository
            .createQueryBuilder('activity')
            .where('activity.username = :username', { username })
            .andWhere('activity.activityCode = :code', { code: LoginActivityCode.LOGIN_FAILED })
            .andWhere('activity.attemptedDateTime >= :fromDate', { fromDate })
            .orderBy('activity.attemptedDateTime', 'DESC')
            .getMany()
    }
}
