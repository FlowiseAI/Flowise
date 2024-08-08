export const prepareAllForEmbedding = async (jiraObjects: any[]) => {
    // console.log('prepareAllForEmbedding');
    // console.time('prepareAllForEmbedding');
    let preparedStatuses
    try {
        if (!jiraObjects) throw new Error('Invalid jiraObjects')
        let promises = []

        for (const obj of jiraObjects) {
            if (obj) promises.push(obj.prepareForEmbedding())
        }
        preparedStatuses = await Promise.all(promises)
    } catch (error) {
        console.error(error)
        throw error
    }

    console.timeEnd('prepareAllForEmbedding')
    return preparedStatuses
}
