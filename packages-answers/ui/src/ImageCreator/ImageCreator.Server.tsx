import getCachedSession from '../getCachedSession'
import ImageCreatorClient from './ImageCreator.Client'

export default async function ImageCreator() {
    const session = await getCachedSession()
    if (!session?.user?.email) return null
    return <ImageCreatorClient user={session.user} />
}
