import React from 'react'
import { prisma } from '@db/client'
import OrganizationForm from '@ui/OrganizationForm'
import getCachedSession from '@ui/getCachedSession'

export const metadata = {
    title: 'Organization Settings | Answer Agent',
    description: 'Organization Settings'
}

const OrganizationFormPage = async ({ params }: any) => {
    const session = await getCachedSession()

    if (!session?.user?.organizationId) return null

    // Only returns the fields we'll be editing
    const organization = await prisma.organization
        .findFirst({
            where: {
                id: session.user.organizationId
            },
            select: { id: true, name: true, contextFields: true }
        })
        .then((data: any) => JSON.parse(JSON.stringify(data)))

    return <OrganizationForm {...params} organization={organization} />
}

export default OrganizationFormPage
