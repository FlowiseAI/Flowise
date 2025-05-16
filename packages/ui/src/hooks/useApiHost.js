export const parseEncodedDomain = (encodedDomain) => {
    const decodedDomain = decodeURIComponent(encodedDomain)
    try {
        const decoded = atob(decodedDomain)
        if (decoded.includes('localhost')) {
            return `http://${decoded}`
        }
        return decoded.startsWith('http') ? decoded : `https://${decoded}`
    } catch (error) {
        // console.warn('Failed to decode base64 domain, using as-is:', decodedDomain, error)
        if (decodedDomain.includes('localhost')) {
            return `http://${decodedDomain}`
        }
        return decodedDomain.startsWith('http') ? decodedDomain : `https://${decodedDomain}`
    }
}
