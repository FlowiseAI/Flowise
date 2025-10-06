import { DataSource } from 'typeorm'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { User } from '../../database/entities/User'

export const findOrCreateDefaultChatflowsForUser = async (AppDataSource: DataSource, user: User) => {
    if (!user) return

    // Always check database for latest defaultChatflowId to avoid race conditions
    // Don't rely on the in-memory user object which may be stale
    const latestUser = await AppDataSource.getRepository(User).findOne({
        where: { id: user.id },
        select: ['defaultChatflowId']
    })

    if (latestUser?.defaultChatflowId) {
        return latestUser.defaultChatflowId
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
            // Check current database state inside transaction to avoid race conditions
            const currentUser = await userRepo.findOne({
                where: { id: user.id },
                select: ['defaultChatflowId']
            })

            if (!currentUser?.defaultChatflowId) {
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
            // Handle potential unique constraint violation gracefully
            let insertResult
            try {
                insertResult = await chatFlowRepo.insert(chatflowToImport)
            } catch (error: any) {
                // If this is a unique constraint violation, another process created the chatflow
                // Find the existing one and use it
                if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
                    const existingChatflowAfterConflict = await chatFlowRepo.findOne({
                        where: {
                            userId: user.id,
                            parentChatflowId: firstId
                        }
                    })

                    if (existingChatflowAfterConflict) {
                        // Update user's defaultChatflowId if not set
                        const currentUser = await userRepo.findOne({
                            where: { id: user.id },
                            select: ['defaultChatflowId']
                        })

                        if (!currentUser?.defaultChatflowId) {
                            await userRepo.update(user.id, { defaultChatflowId: existingChatflowAfterConflict.id })
                        }

                        await queryRunner.commitTransaction()
                        await queryRunner.release()
                        return existingChatflowAfterConflict.id
                    }
                }
                throw error
            }

            // Get the newly created chatflow ID
            const newChatflowId = insertResult.identifiers[0]?.id

            if (newChatflowId) {
                // Double-check that no other process has set a defaultChatflowId in the meantime
                const finalUserCheck = await userRepo.findOne({
                    where: { id: user.id },
                    select: ['defaultChatflowId']
                })

                if (!finalUserCheck?.defaultChatflowId) {
                    // Update the user's defaultChatflowId only if still not set
                    await userRepo.update(user.id, { defaultChatflowId: newChatflowId })
                    await queryRunner.commitTransaction()
                    return newChatflowId
                } else {
                    // Another process already set a defaultChatflowId, use that instead
                    // Soft delete the chatflow we just created to maintain referential integrity
                    const chatflowToDelete = await chatFlowRepo.findOne({ where: { id: newChatflowId } })
                    if (chatflowToDelete) {
                        await chatFlowRepo.update(newChatflowId, {
                            deletedDate: new Date(),
                            name: `${chatflowToDelete.name} (duplicate-removed)`
                        })
                    }
                    await queryRunner.commitTransaction()
                    return finalUserCheck.defaultChatflowId
                }
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
