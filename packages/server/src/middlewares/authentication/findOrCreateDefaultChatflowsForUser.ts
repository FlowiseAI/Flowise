import { DataSource } from 'typeorm'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { User } from '../../database/entities/User'

export const findOrCreateDefaultChatflowsForUser = async (AppDataSource: DataSource, user: User) => {
    if (!user) return

    // If user already has a defaultChatflowId, return it
    if (user.defaultChatflowId) {
        return user.defaultChatflowId
    }

    const rawIds = process.env.INITIAL_CHATFLOW_IDS ?? process.env.INITIAL_CHATFLOW_ID ?? ''
    const ids = rawIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)

    if (!ids.length) {
        return
    }

    // Only use the first ID from the list
    const firstId = ids[0]

    const queryRunner = AppDataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
        const chatFlowRepo = queryRunner.manager.getRepository(ChatFlow)
        const userRepo = queryRunner.manager.getRepository(User)

        // Check if the user already has this specific chatflow
        const existingChatflow = await chatFlowRepo.findOne({
            where: {
                userId: user.id,
                parentChatflowId: firstId
            }
        })

        // If user already has this chatflow, update their defaultChatflowId if not set
        if (existingChatflow) {
            if (!user.defaultChatflowId) {
                await userRepo.update(user.id, { defaultChatflowId: existingChatflow.id })
            }
            await queryRunner.commitTransaction()
            await queryRunner.release()
            return existingChatflow.id
        }

        // Fetch the template for the first ID
        const template = await chatFlowRepo.findOne({
            where: { id: firstId }
        })

        if (template) {
            const templateCopy = { ...template }
            delete (templateCopy as any).id
            delete (templateCopy as any).createdDate
            delete (templateCopy as any).updatedDate

            const chatflowToImport = {
                ...templateCopy,
                parentChatflowId: firstId,
                userId: user.id,
                organizationId: user.organizationId
            }

            // Insert the new chatflow
            const insertResult = await chatFlowRepo.insert(chatflowToImport)

            // Get the newly created chatflow ID
            const newChatflowId = insertResult.identifiers[0]?.id

            if (newChatflowId) {
                // Update the user's defaultChatflowId
                await userRepo.update(user.id, { defaultChatflowId: newChatflowId })
                await queryRunner.commitTransaction()
                return newChatflowId
            }
        }

        await queryRunner.commitTransaction()
    } catch (err) {
        await queryRunner.rollbackTransaction()
        console.error('Error creating default chatflows for user:', err)
    } finally {
        await queryRunner.release()
    }
}
