import { prisma } from '@db/client'

export async function getFullUrlList() {
    const urlsPromise = await prisma.webDocument.findMany({
        select: {
            url: true,
            domain: true,
            id: true
        }
    })
    return urlsPromise
}
