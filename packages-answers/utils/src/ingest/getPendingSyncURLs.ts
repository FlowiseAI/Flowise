import { prisma } from '@db/client'
import { getUrlDomain } from '../getUrlDomain'

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
// If development, then set cache duration to a large negative number, otherwise 1 day
const CACHE_EXPIRATION = IS_DEVELOPMENT ? -10000000 : 1000 * 60 * 60 * 24

const getPendingSyncURLs = async (urls: string[]) => {
    const normalizedUrls = urls.map((url) => url.toLowerCase())

    await prisma.document.createMany({
        data: normalizedUrls.map((url) => ({
            url,
            domain: getUrlDomain(url),
            source: 'web',
            status: 'pending',
            lastSyncedAt: null
        })),
        skipDuplicates: true
    })

    const pendingSyncDocuments = await prisma.document.findMany({
        where: {
            url: { in: normalizedUrls },
            OR: [
                // 1 day has passed since last sync
                { lastSyncedAt: { lte: new Date(Date.now() - CACHE_EXPIRATION) } },
                { status: 'pending' },
                { lastSyncedAt: null }
            ]
        }
    })

    const pendingSyncURLs = pendingSyncDocuments.map((d) => d.url)
    return pendingSyncURLs
}

export default getPendingSyncURLs
