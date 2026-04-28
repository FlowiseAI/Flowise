import client from './client'

const fetchLinks = (url, relativeLinksMethod, relativeLinksLimit) =>
    client.get(`/fetch-links?url=${encodeURIComponent(url)}&relativeLinksMethod=${relativeLinksMethod}&limit=${relativeLinksLimit}`)

export default {
    fetchLinks
}
