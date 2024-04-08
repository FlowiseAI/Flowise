import { v4 as uuidv4 } from 'uuid'

import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Lead } from '../../database/entities/Lead'
import { ILead } from '../../Interface'

const getAllLeads = async (chatflowid: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Lead).find({
            where: {
                chatflowid
            }
        })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: leadsService.getAllLeads - ${error}`)
    }
}

const createLead = async (body: Partial<ILead>) => {
    try {
        const chatId = body.chatId ?? uuidv4()

        const newLead = new Lead()
        Object.assign(newLead, body)
        Object.assign(newLead, { chatId })

        const appServer = getRunningExpressApp()
        const lead = appServer.AppDataSource.getRepository(Lead).create(newLead)
        const dbResponse = await appServer.AppDataSource.getRepository(Lead).save(lead)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: leadsService.createLead - ${error}`)
    }
}

export default {
    createLead,
    getAllLeads
}
