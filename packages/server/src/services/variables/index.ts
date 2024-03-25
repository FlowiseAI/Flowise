import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Variable } from '../../database/entities/Variable'

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
    getAllVariables
}
