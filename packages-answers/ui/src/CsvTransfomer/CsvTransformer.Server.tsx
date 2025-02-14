import getCachedSession from '../getCachedSession'

import CsvTransformerClient from './CsvTransformer.Client'

export default async function CsvTransformer() {
    const session = await getCachedSession()

    if (!session?.user?.email) return null

    return <CsvTransformerClient user={session?.user} />
}
