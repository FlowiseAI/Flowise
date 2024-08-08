import { prisma } from '@db/client'

export async function getDomainList() {
    const domainsPromise = await prisma.webDocument.findMany({
        select: {
            domain: true
        },
        distinct: ['domain']
    })
    return domainsPromise
}
