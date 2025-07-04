import { DataSource, QueryFailedError } from 'typeorm'
import { User } from '../../database/entities/User'

export const findOrCreateUser = async (
    AppDataSource: DataSource,
    auth0Id: string,
    email: string,
    name: string,
    organizationId: string
): Promise<User> => {
    const userRepo = AppDataSource.getRepository(User)

    // First, try to find the user
    let user = await userRepo.findOneBy({ auth0Id })
    if (user) {
        // Update user if needed and return
        if (user.email !== email || user.name !== name || user.organizationId !== organizationId) {
            user.email = email
            user.name = name
            user.organizationId = organizationId
            await userRepo.save(user)
        }
        return user
    }

    // User not found, try to create with transaction and retry logic
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
        const queryRunner = AppDataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            // Check again inside transaction to prevent race condition
            const existingUser = await queryRunner.manager.findOneBy(User, { auth0Id })
            if (existingUser) {
                await queryRunner.release()
                return existingUser
            }

            // Create new user
            const newUser = userRepo.create({ auth0Id, email, name, organizationId })
            const savedUser = await queryRunner.manager.save(newUser)

            await queryRunner.commitTransaction()
            await queryRunner.release()

            console.log(`[AuthMiddleware] Successfully created new user: ${savedUser.id}`)
            return savedUser
        } catch (error) {
            await queryRunner.rollbackTransaction()
            await queryRunner.release()

            // If duplicate key error, retry after a short delay
            if (error instanceof QueryFailedError && error.message.includes('duplicate key')) {
                retryCount++
                console.log(`[AuthMiddleware] Duplicate key error, retrying (${retryCount}/${maxRetries})`)
                await new Promise((resolve) => setTimeout(resolve, 100 * retryCount)) // Exponential backoff

                // Try to get the user that was created in parallel
                user = await userRepo.findOneBy({ auth0Id })
                if (user) {
                    return user
                }
            } else {
                throw error
            }
        }
    }

    // Last attempt to find user after retries
    user = await userRepo.findOneBy({ auth0Id })
    if (user) {
        return user
    }

    throw new Error(`Failed to create or find user with auth0Id: ${auth0Id} after ${maxRetries} retries`)
}
