import { v4 as uuidv4 } from 'uuid'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Lead } from '../../database/entities/Lead'
import { ILead } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

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
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: leadsService.getAllLeads - ${getErrorMessage(error)}`)
    }
}

const createLead = async (body: Partial<ILead>) => {
    try {
        const chatId = body.chatId ?? uuidv4()

        const newLead = new Lead()
        // Whitelist allowed fields to prevent mass assignment vulnerability
        // Only copy explicitly allowed fields from request body
        const allowedFields: (keyof ILead)[] = ['chatflowid', 'name', 'email', 'phone']
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                newLead[field] = body[field] as any
            }
        }
        // Set chatId explicitly (either from body or auto-generated)
        newLead.chatId = chatId

        const appServer = getRunningExpressApp()
        const lead = appServer.AppDataSource.getRepository(Lead).create(newLead)
        const dbResponse = await appServer.AppDataSource.getRepository(Lead).save(lead)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: leadsService.createLead - ${getErrorMessage(error)}`)
    }
}

export default {
    createLead,
    getAllLeads
}
