import getCachedSession from '../getCachedSession'

import Apps from './Apps.Client'

export default async function CsvTransformer() {
    const session = await getCachedSession()

    if (!session?.user?.email) return null

    return <Apps />
}
