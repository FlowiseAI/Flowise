import { FLOWISE_BASE_URL, CHATFLOW_ID, TEST_SESSION_ID, getHeaders, handleApiError, ChatMessageFilter, ChatMessage } from './config';

/**
 * Get all messages for a specific session
 * Uses the existing /chatmessage/{chatflowId} endpoint with sessionId filter
 */
async function getSessionMessages(
    chatflowId: string, 
    sessionId: string, 
    filters?: ChatMessageFilter
): Promise<ChatMessage[]> {
    const queryParams = new URLSearchParams();
    
    // Required session filter
    queryParams.append('sessionId', sessionId);
    
    // Optional filters
    if (filters?.chatType) {
        queryParams.append('chatType', JSON.stringify(filters.chatType));
    }
    if (filters?.memoryType) {
        queryParams.append('memoryType', filters.memoryType);
    }
    if (filters?.startDate) {
        queryParams.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
        queryParams.append('endDate', filters.endDate);
    }
    if (filters?.messageId) {
        queryParams.append('messageId', filters.messageId);
    }
    if (filters?.feedback !== undefined) {
        queryParams.append('feedback', filters.feedback.toString());
    }
    if (filters?.page) {
        queryParams.append('page', filters.page.toString());
    }
    if (filters?.limit) {
        queryParams.append('limit', filters.limit.toString());
    }

    const url = `${FLOWISE_BASE_URL}/api/v1/chatmessage/${chatflowId}?${queryParams.toString()}`;
    
    try {
        console.log('🔍 Fetching session messages...');
        console.log('URL:', url);
        console.log('Session ID:', sessionId);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });

        const responseText = await response.text();
        
        if (!response.ok) {
            handleApiError(response, responseText);
        }

        const messages: ChatMessage[] = JSON.parse(responseText);
        
        console.log('✅ Successfully retrieved messages');
        console.log('📊 Total messages:', messages.length);
        
        if (messages.length > 0) {
            console.log('📝 Message summary:');
            messages.forEach((msg, index) => {
                console.log(`  ${index + 1}. [${msg.role}] ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
                console.log(`     Created: ${msg.createdDate}`);
                console.log(`     Chat ID: ${msg.chatId}`);
                if (msg.sourceDocuments?.length) {
                    console.log(`     📄 Source Documents: ${msg.sourceDocuments.length}`);
                }
                if (msg.usedTools?.length) {
                    console.log(`     🔧 Used Tools: ${msg.usedTools.length}`);
                }
                console.log('');
            });
        } else {
            console.log('ℹ️  No messages found for this session');
        }
        
        return messages;
        
    } catch (error) {
        console.error('❌ Failed to retrieve session messages:', error);
        throw error;
    }
}

/**
 * Test different filtering scenarios
 */
async function runTests() {
    console.log('🧪 Starting Chat Message API Tests\n');
    
    try {
        // Test 1: Get all messages for session
        console.log('=== Test 1: All messages for session ===');
        const allMessages = await getSessionMessages(CHATFLOW_ID, TEST_SESSION_ID);
        
        // Test 2: Filter by chat type
        console.log('\n=== Test 2: External messages only ===');
        const externalMessages = await getSessionMessages(CHATFLOW_ID, TEST_SESSION_ID, {
            chatType: ['EXTERNAL']
        });
        
        // Test 3: Recent messages with pagination
        console.log('\n=== Test 3: Recent messages (last 5) ===');
        const recentMessages = await getSessionMessages(CHATFLOW_ID, TEST_SESSION_ID, {
            limit: 5,
            page: 1
        });
        
        // Test 4: Messages from specific date range
        console.log('\n=== Test 4: Messages from today ===');
        const today = new Date().toISOString().split('T')[0];
        const todayMessages = await getSessionMessages(CHATFLOW_ID, TEST_SESSION_ID, {
            startDate: today,
            endDate: today
        });
        
        console.log('\n🎉 All tests completed successfully!');
        
        // Summary
        console.log('\n📋 Test Summary:');
        console.log(`- Total messages: ${allMessages.length}`);
        console.log(`- External messages: ${externalMessages.length}`);
        console.log(`- Recent messages: ${recentMessages.length}`);
        console.log(`- Today's messages: ${todayMessages.length}`);
        
    } catch (error) {
        console.error('❌ Tests failed:', error);
    }
}

/**
 * Test with a real session ID from a recent conversation
 * You can get this from your browser's network tab or from a prediction response
 */
async function testWithRealSession() {
    // Example: Use a session ID from a real conversation
    const realSessionId = 'your-real-session-id-here';
    
    console.log('\n🔍 Testing with real session ID...');
    console.log('Session ID:', realSessionId);
    
    try {
        const messages = await getSessionMessages(CHATFLOW_ID, realSessionId);
        
        if (messages.length === 0) {
            console.log('ℹ️  No messages found. Try with a session ID from an actual conversation.');
            console.log('💡 Tip: Check browser network tab during a chat to find a real sessionId');
        }
        
    } catch (error) {
        console.error('❌ Real session test failed:', error);
    }
}

// Run the tests
if (require.main === module) {
    console.log('🚀 Flowise Chat Message API Test Suite');
    console.log('=====================================\n');
    
    runTests()
        .then(() => {
            return testWithRealSession();
        })
        .then(() => {
            console.log('\n✅ All tests completed');
        })
        .catch((error) => {
            console.error('\n❌ Test suite failed:', error.message);
            process.exit(1);
        });
}

// Export for use in other files
export { getSessionMessages };