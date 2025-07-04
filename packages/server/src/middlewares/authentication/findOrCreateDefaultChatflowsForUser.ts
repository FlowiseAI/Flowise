import { DataSource, In } from 'typeorm'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { User } from '../../database/entities/User'

export const findOrCreateDefaultChatflowsForUser = async (AppDataSource: DataSource, user: User) => {
    if (!user) return

    const rawIds = process.env.INITIAL_CHATFLOW_IDS ?? ''
    const ids = rawIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)

    if (!ids.length) return

    const queryRunner = AppDataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
        const chatFlowRepo = queryRunner.manager.getRepository(ChatFlow)

        // Batch fetch all existing chatflows for this user and these parentChatflowIds
        const existingChatflows = await chatFlowRepo.find({
            where: {
                userId: user.id,
                parentChatflowId: ids.length === 1 ? ids[0] : In(ids)
            }
        })
        const existingParentIds = new Set(existingChatflows.map((cf) => cf.parentChatflowId))

        // Only import templates the user doesn't already have
        const idsToImport = ids.filter((id) => !existingParentIds.has(id))
        if (!idsToImport.length) {
            await queryRunner.commitTransaction()
            await queryRunner.release()
            return
        }

        // Batch fetch all needed templates
        const templates = await chatFlowRepo.find({
            where: { id: In(idsToImport) }
        })
        const templateMap = new Map(templates.map((t) => [t.id, t]))

        const chatflowsToImport: Partial<ChatFlow>[] = []
        for (const templateId of idsToImport) {
            const template = templateMap.get(templateId)
            if (template) {
                const templateCopy = { ...template }
                delete (templateCopy as any).id
                chatflowsToImport.push({
                    ...templateCopy,
                    parentChatflowId: templateId,
                    userId: user.id,
                    organizationId: user.organizationId
                })
            }
        }
        if (chatflowsToImport.length) {
            await chatFlowRepo.insert(chatflowsToImport)
        }
        await queryRunner.commitTransaction()
    } catch (err) {
        await queryRunner.rollbackTransaction()
        console.error('[findOrCreateDefaultChatflowsForUser] Error in transaction:', err)
    } finally {
        await queryRunner.release()
    }
}
