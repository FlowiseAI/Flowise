const { deliveryClient } = require('./contentfulClients')

const fetchEntriesFromContentful = async (content_type, filters = {}, skip = 0, include = 2, allEntries = []) => {
    const response = await deliveryClient.getEntries({
        ...filters,
        content_type,
        include,
        skip
    })

    allEntries.push(...response.items)

    if (response.total > allEntries.length) {
        return fetchEntriesFromContentful(content_type, filters, allEntries.length, include, allEntries)
    }

    return allEntries
}

module.exports = fetchEntriesFromContentful
