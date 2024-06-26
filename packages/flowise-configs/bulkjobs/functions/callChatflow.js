const axios = require('axios')
const callChatflow = async (answerAiData) => {
    const answerAiHost = process.env.ANSWERAI_API_HOST
    try {
        const response = await axios.post(`${answerAiHost}/api/v1/prediction/${answerAiData.chatflowId}`, {
            question: answerAiData.question,
            overrideConfig: answerAiData.overrideConfig
        })

        return response
    } catch (error) {
        console.error(`Error getting AI response: ${answerAiData}, Host: ${answerAiHost}`)
        console.error(error)
        return error
    }
}

module.exports = callChatflow
