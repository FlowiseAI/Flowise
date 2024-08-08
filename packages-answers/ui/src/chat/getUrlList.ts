import { prisma } from '@db/client'

const getUrlList = async ({ domains }: { domains?: string[] }) => {
    const urlsPromise = await prisma.webDocument.findMany({
        select: {
            url: true
        },
        where: {
            domain: { in: domains }
        }
    })

    return urlsPromise
}

export default getUrlList
