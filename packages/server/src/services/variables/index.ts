import { Variable } from '../../database/entities/Variable'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

//@ts-ignore
const createVariable = async (requestBody) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const newVariable = new Variable()
        Object.assign(newVariable, requestBody)
        const variable = await flowXpresApp.AppDataSource.getRepository(Variable).create(newVariable)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Variable).save(variable)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: variablesService.createVariable - ${error}`)
    }
}

const deleteVariable = async (id: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        if (typeof id === 'undefined' || id === '') {
            throw new Error(`Error: variablesService.deleteVariable - id not provided!`)
        }
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Variable).delete({
            id: id
        })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: variablesService.deleteVariable - ${error}`)
    }
}

const getAllVariables = async () => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Variable).find()
        return dbResponse
    } catch (error) {
        throw new Error(`Error: variablesService.getAllVariables - ${error}`)
    }
}

//@ts-ignore
const updateVariable = async (requestBody, variableId: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const variable = await flowXpresApp.AppDataSource.getRepository(Variable).findOneBy({
            id: variableId
        })
        if (!variable) {
            return {
                executionError: true,
                status: 404,
                msg: `Variable ${variableId} not found`
            }
        }
        const body = requestBody.body
        const updateVariable = new Variable()
        Object.assign(updateVariable, body)
        await flowXpresApp.AppDataSource.getRepository(Variable).merge(variable, updateVariable)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Variable).save(variable)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: variablesService.updateVariable - ${error}`)
    }
}

export default {
    createVariable,
    deleteVariable,
    getAllVariables,
    updateVariable
}
