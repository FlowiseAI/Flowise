import { StatusCodes } from 'http-status-codes'
import { IUser } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { Chat } from '../../database/entities/Chat'
import { Not } from 'typeorm'
import { IsNull } from 'typeorm'

const getAllChats = async (user: IUser) => {
    try {
        console.debug('getAllChats...')
        const appServer = getRunningExpressApp()
        const chats = await appServer.AppDataSource.getRepository(Chat).find({
            where: {
                // users: { some: { email: user.email } },
                owner: { id: user.id },
                organization: { id: user.organizationId },
                chatflowChatId: Not(IsNull())
            },
            order: {
                createdDate: 'DESC'
            }
            // relations: ['prompt', 'messages']
        })
        console.log('chats', chats)
        // Convert to plain objects to avoid circular references
        return JSON.parse(JSON.stringify(chats))
    } catch (error) {
        console.log('error', error)
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: chatsService.getAllChats - ${getErrorMessage(error)}`)
    }
}

export default {
    getAllChats
}
