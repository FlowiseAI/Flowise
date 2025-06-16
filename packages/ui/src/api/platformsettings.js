const getSettings = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings`, {
        credentials: 'include'
    })
    const data = await response.json()
    return { data }
}

export default {
    getSettings
}
