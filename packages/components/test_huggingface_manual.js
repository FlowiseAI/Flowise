#!/usr/bin/env node

/**
 * Manual test script for HuggingFace Embedding API
 * 
 * To run this test:
 * 1. Set your HuggingFace API key: export HUGGINGFACEHUB_API_KEY=your_api_key_here
 * 2. Run: node test_huggingface_manual.js
 * 
 * This will test the actual HuggingFace embedding API calls to verify the
 * deprecated endpoints issue has been fixed.
 */

const { HuggingFaceInferenceEmbeddings } = require('@langchain/community/dist/embeddings/hf.cjs');

async function testHuggingFaceEmbeddings() {
    console.log('HuggingFace Embedding API Manual Test');
    console.log('=====================================\n');
    
    const apiKey = process.env.HUGGINGFACEHUB_API_KEY;
    
    if (!apiKey) {
        console.log('❌ No API key found. Please set HUGGINGFACEHUB_API_KEY environment variable.');
        console.log('   Example: export HUGGINGFACEHUB_API_KEY=hf_your_token_here');
        process.exit(1);
    }
    
    console.log('✓ API key found, testing embedding functionality...\n');
    
    try {
        // Test 1: Basic embedding with default model
        console.log('Test 1: Basic embedding generation');
        const embeddings1 = new HuggingFaceInferenceEmbeddings({
            apiKey: apiKey,
            model: 'sentence-transformers/all-MiniLM-L6-v2'
        });
        
        const testText = 'Hello, this is a test sentence for embedding generation.';
        console.log(`  Input text: "${testText}"`);
        
        const result = await embeddings1.embedQuery(testText);
        console.log(`  ✓ Generated embedding vector of length: ${result.length}`);
        console.log(`  ✓ First few values: [${result.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
        
        // Test 2: Batch embedding
        console.log('\nTest 2: Batch embedding generation');
        const documents = [
            'This is the first document.',
            'Here is the second document.',
            'And this is the third one.'
        ];
        
        const batchResults = await embeddings1.embedDocuments(documents);
        console.log(`  ✓ Generated embeddings for ${batchResults.length} documents`);
        console.log(`  ✓ Each embedding has ${batchResults[0].length} dimensions`);
        
        // Test 3: Custom endpoint (if you have one)
        if (process.env.HUGGINGFACE_ENDPOINT) {
            console.log('\nTest 3: Custom endpoint');
            const embeddings3 = new HuggingFaceInferenceEmbeddings({
                apiKey: apiKey,
                endpointUrl: process.env.HUGGINGFACE_ENDPOINT
            });
            
            const customResult = await embeddings3.embedQuery(testText);
            console.log(`  ✓ Custom endpoint generated embedding of length: ${customResult.length}`);
        } else {
            console.log('\nTest 3: Skipped (no custom endpoint provided)');
            console.log('  Set HUGGINGFACE_ENDPOINT environment variable to test custom endpoints');
        }
        
        console.log('\n✅ All tests passed! HuggingFace embedding API is working correctly.');
        console.log('\n🎉 The deprecated endpoints issue has been resolved by updating to:');
        console.log('   - langchain: 0.3.34');
        console.log('   - @langchain/community: 0.3.56');
        console.log('   - @langchain/core: 0.3.78');
        console.log('   - @huggingface/inference: 4.0.5');
        
    } catch (error) {
        console.error('\n❌ Test failed:');
        console.error(`   Error: ${error.message}`);
        
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
            console.error('   This looks like an API key issue. Please check your HUGGINGFACEHUB_API_KEY.');
        } else if (error.message.includes('blob') || error.message.includes('fetch')) {
            console.error('   This might be the original deprecated endpoints issue.');
            console.error('   Please verify all dependencies are updated correctly.');
        }
        
        console.error('\n   Full error:', error);
        process.exit(1);
    }
}

// Run the test
testHuggingFaceEmbeddings();