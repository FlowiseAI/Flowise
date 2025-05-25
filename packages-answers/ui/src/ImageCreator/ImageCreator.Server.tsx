import getCachedSession from '../getCachedSession'
import ImageCreatorClient from './ImageCreator.Client'

export default async function ImageCreator() {
    const session = await getCachedSession()
    return <ImageCreatorClient user={session?.user} accessToken={session?.accessToken} />
}
