import { FLOWISE_BASE_URL, CHATFLOW_ID, getHeaders, handleApiError, PredictionResponse, ChatMessage } from './config'

/**
 * Integration test for session-based message flow
 * Tests the complete flow: prediction -> session messages -> verification
 */

/**
 * Send a prediction request with custom session ID
 */
async function sendPredictionWithSession(question: string, sessionId: string): Promise<PredictionResponse> {
    const requestBody = {
        question,
        overrideConfig: {
            sessionId
        },
        streaming: false
    }

    const response = await fetch(`${FLOWISE_BASE_URL}/api/v1/prediction/${CHATFLOW_ID}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody)
    })

    const responseText = await response.text()

    if (!response.ok) {
        handleApiError(response, responseText)
    }

    const result: PredictionResponse = JSON.parse(responseText)

    return result
}

/**
 * Retrieve all messages for a session
 */
async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const queryParams = new URLSearchParams()
    queryParams.append('sessionId', sessionId)

    const url = `${FLOWISE_BASE_URL}/api/v1/chatmessage/${CHATFLOW_ID}?${queryParams.toString()}`

    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders()
    })

    const responseText = await response.text()

    if (!response.ok) {
        handleApiError(response, responseText)
    }

    const messages: ChatMessage[] = JSON.parse(responseText)

    return messages
}

/**
 * Assert that expected messages exist in the session
 */
function assertMessagesExist(messages: ChatMessage[], expectedQuestions: string[], sessionId: string): void {
    // Check total message count (user + assistant messages)
    const expectedMinMessages = expectedQuestions.length * 2 // Each question gets user + assistant response
    if (messages.length < expectedMinMessages) {
        throw new Error(`Expected at least ${expectedMinMessages} messages, got ${messages.length}`)
    }

    // Check session ID consistency
    const wrongSessionMessages = messages.filter((msg) => msg.sessionId && msg.sessionId !== sessionId)
    if (wrongSessionMessages.length > 0) {
        throw new Error(`Found ${wrongSessionMessages.length} messages with wrong session ID`)
    }

    // Check that each expected question exists
    const userMessages = messages.filter((msg) => msg.role === 'userMessage')

    for (const expectedQuestion of expectedQuestions) {
        const foundMessage = userMessages.find((msg) => msg.content.trim().toLowerCase() === expectedQuestion.trim().toLowerCase())
        if (!foundMessage) {
            throw new Error(`Question not found in messages: "${expectedQuestion}"`)
        }
    }

    // Check message timestamps are recent (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    messages.filter((msg) => new Date(msg.createdDate) > fiveMinutesAgo)
}

/**
 * Main integration test
 */
async function runSessionIntegrationTest(): Promise<void> {
    const testSessionId = `integration-test-${Date.now()}`
    const testQuestions = [
        'Hello, this is a test message for session integration',
        'Can you remember my first message? This is the second message.'
    ]

    const predictions: PredictionResponse[] = []

    // Step 1: Send multiple messages with same session ID
    for (let i = 0; i < testQuestions.length; i++) {
        const question = testQuestions[i]
        if (!question) {
            throw new Error(`Test question ${i} is undefined`)
        }

        const prediction = await sendPredictionWithSession(question, testSessionId)
        predictions.push(prediction)

        // Verify session ID in response
        if (prediction.sessionId !== testSessionId) {
            throw new Error(`Session ID mismatch! Expected: ${testSessionId}, Got: ${prediction.sessionId || 'undefined'}`)
        }

        // Small delay between messages
        await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Step 2: Wait a moment for messages to be stored
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Step 3: Retrieve session messages
    const sessionMessages = await getSessionMessages(testSessionId)

    // Step 4: Assert messages exist
    assertMessagesExist(sessionMessages, testQuestions, testSessionId)
}

/**
 * Clean up test data (optional)
 */
async function _cleanupTestSession(sessionId: string): Promise<void> {
    try {
        await fetch(`${FLOWISE_BASE_URL}/api/v1/chatmessage/${CHATFLOW_ID}?sessionId=${sessionId}`, {
            method: 'DELETE',
            headers: getHeaders()
        })
    } catch (_error) {
        // Cleanup failed
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    runSessionIntegrationTest()
        .then(() => {
            process.exit(0)
        })
        .catch((_error) => {
            process.exit(1)
        })
}

// Export for use in other test files
export { runSessionIntegrationTest, sendPredictionWithSession, getSessionMessages, assertMessagesExist }
