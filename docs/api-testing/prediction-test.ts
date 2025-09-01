import { FLOWISE_BASE_URL, CHATFLOW_ID, getHeaders, handleApiError, PredictionResponse } from './config';

/**
 * Test Flowise prediction API with streaming and non-streaming modes
 * Includes timestamp validation for the new timestamp feature
 */
async function testFlowisePrediction(
    message: string, 
    stream: boolean = false, 
    chatId?: string
): Promise<any> {
    const requestBody: any = {
        question: message,
    };
    
    if (stream) {
        requestBody.streaming = true;
    }
    
    if (chatId) {
        requestBody.chatId = chatId;
    }

    try {
        console.log(`🚀 Testing ${stream ? 'streaming' : 'non-streaming'} prediction...`);
        console.log('📝 Message:', message);
        console.log('💬 Chat ID:', chatId || 'auto-generated');
        
        const response = await fetch(`${FLOWISE_BASE_URL}/api/v1/prediction/${CHATFLOW_ID}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            handleApiError(response, errorText);
        }

        if (stream) {
            return await handleStreamingResponse(response);
        } else {
            return await handleNonStreamingResponse(response);
        }
    } catch (error) {
        console.error('❌ Flowise prediction error:', error);
        throw error;
    }
}

/**
 * Handle streaming response (Server-Sent Events)
 */
async function handleStreamingResponse(response: Response): Promise<string> {
    if (!response.body) {
        throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    let metadata: any = null;

    console.log('📡 Streaming response:');
    console.log('---');

    try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const data = line.slice(5).trim();

                    try {
                        const parsed = JSON.parse(data);
                        
                        if (parsed.event === 'token') {
                            process.stdout.write(parsed.data);
                            result += parsed.data;
                        } else if (parsed.event === 'start') {
                            console.log('\n🎬 Stream started');
                        } else if (parsed.event === 'metadata') {
                            metadata = parsed.data;
                            console.log('\n📊 Metadata received:');
                            console.log('  Chat ID:', metadata.chatId);
                            console.log('  Session ID:', metadata.sessionId);
                            console.log('  Memory Type:', metadata.memoryType);
                            console.log('  Message ID:', metadata.chatMessageId);
                        } else if (parsed.event === 'end' && parsed.data === '[DONE]') {
                            console.log('\n\n✅ Streaming completed');
                            break;
                        }
                    } catch (e) {
                        // Skip non-JSON lines
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    console.log('---');
    console.log('📄 Final result length:', result.length, 'characters');
    
    return result;
}

/**
 * Handle non-streaming response
 */
async function handleNonStreamingResponse(response: Response): Promise<PredictionResponse> {
    const data: PredictionResponse = await response.json();
    
    console.log('📦 Non-streaming response received:');
    console.log('  Text length:', data.text?.length || 0, 'characters');
    console.log('  Chat ID:', data.chatId);
    console.log('  Session ID:', data.sessionId);
    console.log('  Memory Type:', data.memoryType);
    console.log('  Message ID:', data.chatMessageId);
    
    // Validate timestamp (new feature)
    if (data.timestamp) {
        console.log('  ⏰ Timestamp:', data.timestamp);
        console.log('  📅 Timestamp valid:', isValidISOTimestamp(data.timestamp) ? '✅' : '❌');
    } else {
        console.log('  ⚠️  Missing timestamp field');
    }
    
    console.log('  Stream valid:', data.isStreamValid);
    
    return data;
}

/**
 * Validate ISO timestamp format
 */
function isValidISOTimestamp(timestamp: string): boolean {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    return isoRegex.test(timestamp) && !isNaN(new Date(timestamp).getTime());
}

/**
 * Run comprehensive prediction tests
 */
async function runPredictionTests() {
    console.log('🧪 Starting Prediction API Tests\n');
    
    const testChatId = `test-${Date.now()}`;
    
    try {
        // Test 1: Non-streaming prediction
        console.log('=== Test 1: Non-streaming prediction ===');
        const nonStreamResult = await testFlowisePrediction(
            'Hello, how are you?', 
            false, 
            testChatId
        );
        
        // Test 2: Streaming prediction
        console.log('\n=== Test 2: Streaming prediction ===');
        const streamResult = await testFlowisePrediction(
            'Tell me a short joke', 
            true, 
            testChatId
        );
        
        // Test 3: Follow-up message (same session)
        console.log('\n=== Test 3: Follow-up message ===');
        const followupResult = await testFlowisePrediction(
            'Can you explain that joke?', 
            false, 
            testChatId
        );
        
        console.log('\n🎉 All prediction tests completed successfully!');
        
        // Summary
        console.log('\n📋 Test Summary:');
        console.log('- Non-streaming response timestamp:', nonStreamResult.timestamp ? '✅' : '❌');
        console.log('- Streaming completed:', streamResult ? '✅' : '❌');
        console.log('- Follow-up context maintained:', followupResult.chatId === testChatId ? '✅' : '❌');
        console.log('- Session ID consistent:', 
            (nonStreamResult.sessionId === followupResult.sessionId) ? '✅' : '❌');
        
        return {
            nonStreamResult,
            streamResult,
            followupResult,
            testChatId
        };
        
    } catch (error) {
        console.error('❌ Prediction tests failed:', error);
        throw error;
    }
}

/**
 * Test error handling scenarios
 */
async function testErrorHandling() {
    console.log('\n=== Testing Error Handling ===');
    
    try {
        // Test with invalid chatflow ID
        console.log('🔍 Testing invalid chatflow ID...');
        await fetch(`${FLOWISE_BASE_URL}/api/v1/prediction/invalid-id`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ question: 'test' }),
        });
    } catch (error) {
        console.log('✅ Invalid chatflow ID properly handled');
    }
    
    try {
        // Test with empty question
        console.log('🔍 Testing empty question...');
        const response = await testFlowisePrediction('', false);
        console.log('✅ Empty question handled, response:', response.text?.substring(0, 50));
    } catch (error) {
        console.log('⚠️  Empty question caused error:', error.message);
    }
}

// Run the tests
if (require.main === module) {
    console.log('🚀 Flowise Prediction API Test Suite');
    console.log('====================================\n');
    
    runPredictionTests()
        .then((results) => {
            console.log('\n📝 Test completed. Chat ID for session message testing:', results.testChatId);
            return testErrorHandling();
        })
        .then(() => {
            console.log('\n✅ All tests completed successfully');
        })
        .catch((error) => {
            console.error('\n❌ Test suite failed:', error.message);
            process.exit(1);
        });
}

// Export for use in other files
export { testFlowisePrediction };