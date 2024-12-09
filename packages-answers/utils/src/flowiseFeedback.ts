import { FeedbackPayload } from 'types'

export const postFlowiseFeedback = async (body: FeedbackPayload) => {
    const { domain, accessToken, ...data } = body
    const result = await fetch(`${domain}/api/v1/feedback`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(data)
    })
    if (result.ok) {
        const data = await result.json()
        return data
    } else {
        const error = await result.text()
        throw new Error(error)
    }
}
