import { FLOWISE_BASE_URL, CHATFLOW_ID, TEST_SESSION_ID, getHeaders, handleApiError, ChatMessageFilter, ChatMessage } from './config'

/**
 * Get all messages for a specific session
 * Uses the existing /chatmessage/{chatflowId} endpoint with sessionId filter
 */
async function getSessionMessages(chatflowId: string, sessionId: string, filters?: ChatMessageFilter): Promise<ChatMessage[]> {
    const queryParams = new URLSearchParams()

    // Required session filter
    queryParams.append('sessionId', sessionId)

    // Optional filters
    if (filters?.chatType) {
        queryParams.append('chatType', JSON.stringify(filters.chatType))
    }
    if (filters?.memoryType) {
        queryParams.append('memoryType', filters.memoryType)
    }
    if (filters?.startDate) {
        queryParams.append('startDate', filters.startDate)
    }
    if (filters?.endDate) {
        queryParams.append('endDate', filters.endDate)
    }
    if (filters?.messageId) {
        queryParams.append('messageId', filters.messageId)
    }
    if (filters?.feedback !== undefined) {
        queryParams.append('feedback', filters.feedback.toString())
    }
    if (filters?.page) {
        queryParams.append('page', filters.page.toString())
    }
    if (filters?.limit) {
        queryParams.append('limit', filters.limit.toString())
    }

    const url = `${FLOWISE_BASE_URL}/api/v1/chatmessage/${chatflowId}?${queryParams.toString()}`

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
 * Test different filtering scenarios
 */
async function runTests() {
    // Test 1: Get all messages for session
    await getSessionMessages(CHATFLOW_ID, TEST_SESSION_ID)

    // Test 2: Filter by chat type
    await getSessionMessages(CHATFLOW_ID, TEST_SESSION_ID, {
        chatType: ['EXTERNAL']
    })

    // Test 3: Recent messages with pagination
    await getSessionMessages(CHATFLOW_ID, TEST_SESSION_ID, {
        limit: 5,
        page: 1
    })

    // Test 4: Messages from specific date range
    const today = new Date().toISOString().split('T')[0]
    await getSessionMessages(CHATFLOW_ID, TEST_SESSION_ID, {
        startDate: today,
        endDate: today
    })
}

/**
 * Test with a real session ID from a recent conversation
 * You can get this from your browser's network tab or from a prediction response
 */
async function testWithRealSession() {
    // Example: Use a session ID from a real conversation
    const realSessionId = 'your-real-session-id-here'

    try {
        await getSessionMessages(CHATFLOW_ID, realSessionId)
    } catch (_error) {
        // Real session test failed
    }
}

// Run the tests
if (require.main === module) {
    runTests()
        .then(() => {
            return testWithRealSession()
        })
        .then(() => {
            // Tests completed
        })
        .catch((_error) => {
            process.exit(1)
        })
}

// Export for use in other files
export { getSessionMessages }
