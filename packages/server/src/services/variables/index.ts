import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Variable } from '../../database/entities/Variable'

const createVariable = async (newVariable: Variable) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const variable = await flowXpresApp.AppDataSource.getRepository(Variable).create(newVariable)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Variable).save(variable)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: variablesServices.createVariable - ${error}`)
    }
}

const getAllVariables = async () => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Variable).find()
        return dbResponse
    } catch (error) {
        throw new Error(`Error: variablesServices.getAllVariables - ${error}`)
    }
}

export default {
    createVariable,
    getAllVariables
}
