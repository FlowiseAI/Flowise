import { StatusCodes } from 'http-status-codes'
import { Skill } from '../../database/entities/Skill'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const createSkill = async (requestBody: any, orgId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const newSkill = new Skill()
        Object.assign(newSkill, requestBody)
        const skill = await appServer.AppDataSource.getRepository(Skill).create(newSkill)
        const dbResponse = await appServer.AppDataSource.getRepository(Skill).save(skill)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.createSkill - ${getErrorMessage(error)}`)
    }
}

const deleteSkill = async (skillId: string, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Skill).delete({
            id: skillId,
            workspaceId: workspaceId
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.deleteSkill - ${getErrorMessage(error)}`)
    }
}

const getAllSkills = async (workspaceId?: string, page: number = -1, limit: number = -1) => {
    try {
        const appServer = getRunningExpressApp()
        const queryBuilder = appServer.AppDataSource.getRepository(Skill).createQueryBuilder('skill').orderBy('skill.updatedDate', 'DESC')

        if (page > 0 && limit > 0) {
            queryBuilder.skip((page - 1) * limit)
            queryBuilder.take(limit)
        }
        if (workspaceId) queryBuilder.andWhere('skill.workspaceId = :workspaceId', { workspaceId })
        const [data, total] = await queryBuilder.getManyAndCount()

        if (page > 0 && limit > 0) {
            return { data, total }
        } else {
            return data
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.getAllSkills - ${getErrorMessage(error)}`)
    }
}

const getSkillById = async (skillId: string, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Skill).findOneBy({
            id: skillId,
            workspaceId: workspaceId
        })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Skill ${skillId} not found`)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.getSkillById - ${getErrorMessage(error)}`)
    }
}

const updateSkill = async (skillId: string, skillBody: any, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const skill = await appServer.AppDataSource.getRepository(Skill).findOneBy({
            id: skillId,
            workspaceId: workspaceId
        })
        if (!skill) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Skill ${skillId} not found`)
        }
        const updateSkill = new Skill()
        Object.assign(updateSkill, skillBody)
        appServer.AppDataSource.getRepository(Skill).merge(skill, updateSkill)
        const dbResponse = await appServer.AppDataSource.getRepository(Skill).save(skill)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.updateSkill - ${getErrorMessage(error)}`)
    }
}

export default {
    createSkill,
    deleteSkill,
    getAllSkills,
    getSkillById,
    updateSkill
}
