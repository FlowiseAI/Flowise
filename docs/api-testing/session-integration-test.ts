import { FLOWISE_BASE_URL, CHATFLOW_ID, getHeaders, handleApiError, PredictionResponse, ChatMessage } from './config';

/**
 * Integration test for session-based message flow
 * Tests the complete flow: prediction -> session messages -> verification
 */

interface TestSession {
    sessionId: string;
    messages: Array<{
        question: string;
        expectedInResponse: string;
    }>;
}

/**
 * Send a prediction request with custom session ID
 */
async function sendPredictionWithSession(
    question: string, 
    sessionId: string
): Promise<PredictionResponse> {
    const requestBody = {
        question,
        overrideConfig: {
            sessionId
        },
        streaming: false
    };

    try {
        console.log(`📤 Sending prediction with custom session...`);
        console.log(`  Question: "${question}"`);
        console.log(`  Session ID: ${sessionId}`);
        
        const response = await fetch(`${FLOWISE_BASE_URL}/api/v1/prediction/${CHATFLOW_ID}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        
        if (!response.ok) {
            handleApiError(response, responseText);
        }

        const result: PredictionResponse = JSON.parse(responseText);
        
        console.log(`✅ Prediction successful`);
        console.log(`  Response length: ${result.text?.length || 0} chars`);
        console.log(`  Chat ID: ${result.chatId}`);
        console.log(`  Session ID: ${result.sessionId}`);
        console.log(`  Timestamp: ${result.timestamp}`);
        console.log(`  Message ID: ${result.chatMessageId}`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Prediction failed:', error);
        throw error;
    }
}

/**
 * Retrieve all messages for a session
 */
async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('sessionId', sessionId);
    
    const url = `${FLOWISE_BASE_URL}/api/v1/chatmessage/${CHATFLOW_ID}?${queryParams.toString()}`;
    
    try {
        console.log(`🔍 Retrieving session messages...`);
        console.log(`  Session ID: ${sessionId}`);
        console.log(`  URL: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });

        const responseText = await response.text();
        
        if (!response.ok) {
            handleApiError(response, responseText);
        }

        const messages: ChatMessage[] = JSON.parse(responseText);
        
        console.log(`✅ Messages retrieved successfully`);
        console.log(`  Total messages: ${messages.length}`);
        
        return messages;
        
    } catch (error) {
        console.error('❌ Failed to retrieve messages:', error);
        throw error;
    }
}

/**
 * Assert that expected messages exist in the session
 */
function assertMessagesExist(
    messages: ChatMessage[], 
    expectedQuestions: string[],
    sessionId: string
): void {
    console.log(`🔍 Validating messages...`);
    
    // Check total message count (user + assistant messages)
    const expectedMinMessages = expectedQuestions.length * 2; // Each question gets user + assistant response
    if (messages.length < expectedMinMessages) {
        throw new Error(`Expected at least ${expectedMinMessages} messages, got ${messages.length}`);
    }
    console.log(`✅ Message count valid: ${messages.length} messages`);
    
    // Check session ID consistency
    const wrongSessionMessages = messages.filter(msg => 
        msg.sessionId && msg.sessionId !== sessionId
    );
    if (wrongSessionMessages.length > 0) {
        throw new Error(`Found ${wrongSessionMessages.length} messages with wrong session ID`);
    }
    console.log(`✅ All messages have correct session ID`);
    
    // Check that each expected question exists
    const userMessages = messages.filter(msg => msg.role === 'userMessage');
    const assistantMessages = messages.filter(msg => msg.role === 'apiMessage');
    
    console.log(`  User messages: ${userMessages.length}`);
    console.log(`  Assistant messages: ${assistantMessages.length}`);
    
    for (const expectedQuestion of expectedQuestions) {
        const foundMessage = userMessages.find(msg => 
            msg.content.trim().toLowerCase() === expectedQuestion.trim().toLowerCase()
        );
        if (!foundMessage) {
            throw new Error(`Question not found in messages: "${expectedQuestion}"`);
        }
        console.log(`  ✅ Found question: "${expectedQuestion}"`);
    }
    
    // Check message timestamps are recent (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentMessages = messages.filter(msg => 
        new Date(msg.createdDate) > fiveMinutesAgo
    );
    
    if (recentMessages.length !== messages.length) {
        console.log(`⚠️  Warning: Some messages are older than 5 minutes`);
        console.log(`  Recent: ${recentMessages.length}, Total: ${messages.length}`);
    } else {
        console.log(`✅ All messages are recent (within 5 minutes)`);
    }
    
    console.log(`🎉 All assertions passed!`);
}

/**
 * Main integration test
 */
async function runSessionIntegrationTest(): Promise<void> {
    const testSessionId = `integration-test-${Date.now()}`;
    const testQuestions = [
        "Hello, this is a test message for session integration",
        "Can you remember my first message? This is the second message."
    ];
    
    console.log('🚀 Starting Session Integration Test');
    console.log('=====================================\n');
    console.log(`Test Session ID: ${testSessionId}`);
    console.log(`Test Questions: ${testQuestions.length} messages\n`);
    
    try {
        const predictions: PredictionResponse[] = [];
        
        // Step 1: Send multiple messages with same session ID
        console.log('=== Step 1: Sending Predictions ===');
        for (let i = 0; i < testQuestions.length; i++) {
            const question = testQuestions[i];
            if (!question) {
                throw new Error(`Test question ${i} is undefined`);
            }
            console.log(`\nMessage ${i + 1}/${testQuestions.length}:`);
            
            const prediction = await sendPredictionWithSession(question, testSessionId);
            predictions.push(prediction);
            
            // Verify session ID in response
            if (prediction.sessionId !== testSessionId) {
                throw new Error(`Session ID mismatch! Expected: ${testSessionId}, Got: ${prediction.sessionId || 'undefined'}`);
            }
            
            // Small delay between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Step 2: Wait a moment for messages to be stored
        console.log('\n=== Step 2: Waiting for Message Storage ===');
        console.log('⏳ Waiting 2 seconds for database storage...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 3: Retrieve session messages
        console.log('\n=== Step 3: Retrieving Session Messages ===');
        const sessionMessages = await getSessionMessages(testSessionId);
        
        // Step 4: Assert messages exist
        console.log('\n=== Step 4: Validating Messages ===');
        assertMessagesExist(sessionMessages, testQuestions, testSessionId);
        
        // Step 5: Display detailed results
        console.log('\n=== Step 5: Test Results ===');
        console.log('📋 Detailed Message Analysis:');
        sessionMessages
            .sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime())
            .forEach((msg, index) => {
                console.log(`  ${index + 1}. [${msg.role}] ${msg.content.substring(0, 80)}${msg.content.length > 80 ? '...' : ''}`);
                console.log(`     📅 ${msg.createdDate}`);
                console.log(`     💬 Chat ID: ${msg.chatId}`);
                console.log(`     🆔 Session ID: ${msg.sessionId}`);
                console.log(`     🔗 Message ID: ${msg.id}`);
                console.log('');
            });
        
        // Summary
        console.log('🎉 INTEGRATION TEST PASSED! 🎉');
        console.log('\n📊 Test Summary:');
        console.log(`✅ Sent ${predictions.length} predictions successfully`);
        console.log(`✅ Retrieved ${sessionMessages.length} messages from session`);
        console.log(`✅ All messages have correct session ID: ${testSessionId}`);
        console.log(`✅ All expected questions found in message history`);
        console.log(`✅ Message timestamps are valid`);
        
        return;
        
    } catch (error) {
        console.error('\n❌ INTEGRATION TEST FAILED! ❌');
        console.error('Error:', error instanceof Error ? error.message : String(error));
        throw error;
    }
}

/**
 * Clean up test data (optional)
 */
async function cleanupTestSession(sessionId: string): Promise<void> {
    console.log(`\n🧹 Cleaning up test session: ${sessionId}`);
    
    try {
        const response = await fetch(`${FLOWISE_BASE_URL}/api/v1/chatmessage/${CHATFLOW_ID}?sessionId=${sessionId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        
        if (response.ok) {
            console.log('✅ Test session cleaned up successfully');
        } else {
            console.log('⚠️  Cleanup warning: Could not delete test messages (may require manual cleanup)');
        }
    } catch (error) {
        console.log('⚠️  Cleanup warning: Failed to cleanup test messages');
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    runSessionIntegrationTest()
        .then(() => {
            console.log('\n✅ Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test failed:', error.message);
            process.exit(1);
        });
}

// Export for use in other test files
export { 
    runSessionIntegrationTest, 
    sendPredictionWithSession, 
    getSessionMessages, 
    assertMessagesExist 
};