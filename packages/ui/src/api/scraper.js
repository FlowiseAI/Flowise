import client from './client'

const fetchAllLinks = (url, relativeLinksMethod) =>
    client.get(`/fetch-links?url=${encodeURIComponent(url)}&relativeLinksMethod=${relativeLinksMethod}`)

export default {
    fetchAllLinks
}
