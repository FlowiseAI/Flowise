import { User, Organization } from 'types'
import { prisma } from '@db/client'
import { buildSettings } from './buildSettings'
import { SYSTEM_SETTINGS } from './SYSTEM_SETTINGS'

export async function syncAppSettings({ userId, organizationId }: { userId: string; organizationId?: string }) {
    // if (!session?.user?.email) return NextResponse.redirect('/auth');
    // TODO: Move this into a middleware

    if (!userId) {
        console.log('No User Session', userId)
        return SYSTEM_SETTINGS
    }
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            accounts: true,
            organizations: true,
            currentOrganization: {
                include: { contextFields: true }
            },
            contextFields: true
        }
    })
    let organization
    if (!user?.organizations?.length) {
        organization = await prisma.organization.create({
            data: {
                name: `${user?.name} Personal`,
                users: { connect: { id: userId } }
            }
        })

        await prisma.user.update({
            where: { id: userId },
            data: {
                currentOrganization: { connect: { id: organization.id } }
            }
        })
    }
    console.log('[syncAppSettings] user', user?.id)
    // TODO: Verify user ownership or permisson scope
    // TODO: Enable user app settings
    // if (user) {
    //   let organization;

    //   if (organizationId) {
    //     organization = await prisma.organization.findFirst({
    //       where: { OR: { id: organizationId, users: { some: { id: user.id } } } }
    //     });
    //     return updateOrgSettings(user as User, organization as Organization);
    //   } else if (user?.organizations?.length > 0) {
    //     organization = await prisma.organization.findFirst({
    //       where: { OR: { id: organizationId } }
    //     });
    //   } else {
    //     organization = await prisma.organization.create({
    //       data: { users: { connect: { id: user.id } } }
    //     });
    //   }

    return updateUserSettings(user as any)
    // }
    return SYSTEM_SETTINGS
}

const updateUserSettings = async (user: User) => {
    // if (!session?.user?.email) return NextResponse.redirect('/auth');
    // TODO: Move this into a middleware
    // TODO: Verify user ownership or permisson scope
    if (user) {
        const appSettings = await buildSettings(user)

        await prisma.user.update({
            where: { id: user?.id },
            data: {
                appSettings: appSettings as object
            }
        })
        return appSettings
    }
}

const updateOrgSettings = async (user: User, org: Organization) => {
    // if (!session?.user?.email) return NextResponse.redirect('/auth');
    // TODO: Move this into a middleware
    // TODO: Verify user ownership or permisson scope
    // TODO: Verify role to update org settings
    if (user && org) {
        const appSettings = await buildSettings(user, org)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                appSettings: appSettings as object
            }
        })

        return appSettings
    }
}
