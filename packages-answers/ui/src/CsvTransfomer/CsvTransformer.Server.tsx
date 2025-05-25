import getCachedSession from '../getCachedSession'

import CsvTransformerClient from './CsvTransformer.Client'

export default async function CsvTransformer() {
    const session = await getCachedSession()

    return <CsvTransformerClient user={session?.user} />
}
