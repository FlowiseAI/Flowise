import { DataSource } from 'typeorm'
import { Organization } from '../../database/entities/Organization'
import { QueryFailedError } from 'typeorm'

export const findOrCreateOrganization = async (AppDataSource: DataSource, auth0OrgId: string, orgName: string): Promise<Organization> => {
    const orgRepo = AppDataSource.getRepository(Organization)

    let organization = await orgRepo.findOneBy({ auth0Id: auth0OrgId })

    if (organization) {
        if (organization.name !== orgName) {
            organization.name = orgName
            await orgRepo.save(organization)
        }
        return organization
    }

    // Organization not found, create with transaction
    const queryRunner = AppDataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
        // Check again inside transaction
        organization = await queryRunner.manager.findOneBy(Organization, { auth0Id: auth0OrgId })
        if (organization) {
            await queryRunner.release()
            return organization
        }

        // Create new organization
        const newOrg = orgRepo.create({ auth0Id: auth0OrgId, name: orgName })
        organization = await queryRunner.manager.save(newOrg)

        await queryRunner.commitTransaction()
        await queryRunner.release()

        return organization
    } catch (error) {
        await queryRunner.rollbackTransaction()
        await queryRunner.release()

        if (error instanceof QueryFailedError && error.message.includes('duplicate key')) {
            // If duplicate key, try to fetch the existing organization
            organization = await orgRepo.findOneBy({ auth0Id: auth0OrgId })
            if (organization) {
                return organization
            }
        }

        throw error
    }
}
