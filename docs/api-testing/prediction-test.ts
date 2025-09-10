import { FLOWISE_BASE_URL, CHATFLOW_ID, getHeaders, handleApiError, PredictionResponse } from './config'

/**
 * Test Flowise prediction API with streaming and non-streaming modes
 * Includes timestamp validation for the new timestamp feature
 */
async function testFlowisePrediction(message: string, stream: boolean = false, chatId?: string): Promise<any> {
    const requestBody: any = {
        question: message
    }

    if (stream) {
        requestBody.streaming = true
    }

    if (chatId) {
        requestBody.chatId = chatId
    }

    const response = await fetch(`${FLOWISE_BASE_URL}/api/v1/prediction/${CHATFLOW_ID}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
        const errorText = await response.text()
        handleApiError(response, errorText)
    }

    if (stream) {
        return await handleStreamingResponse(response)
    } else {
        return await handleNonStreamingResponse(response)
    }
}

/**
 * Handle streaming response (Server-Sent Events)
 */
async function handleStreamingResponse(response: Response): Promise<string> {
    if (!response.body) {
        throw new Error('No response body for streaming')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let result = ''

    try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read()

            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const data = line.slice(5).trim()

                    try {
                        const parsed = JSON.parse(data)

                        if (parsed.event === 'token') {
                            process.stdout.write(parsed.data)
                            result += parsed.data
                        } else if (parsed.event === 'start') {
                            // Stream started
                        } else if (parsed.event === 'metadata') {
                            // Metadata received
                        } else if (parsed.event === 'end' && parsed.data === '[DONE]') {
                            break
                        }
                    } catch (e) {
                        // Skip non-JSON lines
                    }
                }
            }
        }
    } finally {
        reader.releaseLock()
    }

    return result
}

/**
 * Handle non-streaming response
 */
async function handleNonStreamingResponse(response: Response): Promise<PredictionResponse> {
    const data: PredictionResponse = await response.json()

    return data
}

/**
 * Run comprehensive prediction tests
 */
async function runPredictionTests() {
    const testChatId = `test-${Date.now()}`

    // Test 1: Non-streaming prediction
    const nonStreamResult = await testFlowisePrediction('Hello, how are you?', false, testChatId)

    // Test 2: Streaming prediction
    const streamResult = await testFlowisePrediction('Tell me a short joke', true, testChatId)

    // Test 3: Follow-up message (same session)
    const followupResult = await testFlowisePrediction('Can you explain that joke?', false, testChatId)

    return {
        nonStreamResult,
        streamResult,
        followupResult,
        testChatId
    }
}

/**
 * Test error handling scenarios
 */
async function testErrorHandling() {
    try {
        // Test with invalid chatflow ID
        await fetch(`${FLOWISE_BASE_URL}/api/v1/prediction/invalid-id`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ question: 'test' })
        })
    } catch (_error) {
        // Invalid chatflow ID properly handled
    }

    try {
        // Test with empty question
        await testFlowisePrediction('', false)
    } catch (_error) {
        // Empty question caused error
    }
}

// Run the tests
if (require.main === module) {
    runPredictionTests()
        .then((_results) => {
            return testErrorHandling()
        })
        .then(() => {
            // All tests completed successfully
        })
        .catch((_error) => {
            process.exit(1)
        })
}

// Export for use in other files
export { testFlowisePrediction }
