import { StatusCodes } from 'http-status-codes'
import { IUser } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { Chat } from '../../database/entities/Chat'
import { Not, IsNull } from 'typeorm'

const getAllChats = async (user: IUser) => {
    try {
        const appServer = getRunningExpressApp()
        const chats = await appServer.AppDataSource.getRepository(Chat).find({
            where: {
                owner: { id: user.id },
                organization: { id: user.organizationId },
                chatflowChatId: Not(IsNull())
            },
            order: {
                createdDate: 'DESC'
            }
        })
        return JSON.parse(JSON.stringify(chats))
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: chatsService.getAllChats - ${getErrorMessage(error)}`)
    }
}

const getChatById = async (chatId: string, user: IUser) => {
    try {
        const appServer = getRunningExpressApp()
        const chat = await appServer.AppDataSource.getRepository(Chat).findOne({
            where: {
                id: chatId,
                owner: { id: user.id },
                organization: { id: user.organizationId }
            },
            relations: {
                chatflow: true
                // users: true,
                // messages: true
            },
            order: {
                updatedDate: 'DESC'
                // messages: {
                //     createdDate: 'ASC'
                // }
            }
        })

        if (!chat) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chat ${chatId} not found`)
        }

        return JSON.parse(JSON.stringify(chat))
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: chatsService.getChatById - ${getErrorMessage(error)}`)
    }
}

export default {
    getAllChats,
    getChatById
}
