// scripts/testing-chatflows/example_chatflows.js
//
// Example chatflows configuration for testing chatflow endpoints
// Copy this file to chatflows.js and modify with your actual chatflow IDs and conversations
//
// This file demonstrates various chatflow patterns and conversation formats
// that can be used with the testingChatflows.js script.

/**
 * Chatflow Configuration Format:
 *
 * Each chatflow object should have:
 * - id: The chatflow UUID (can be full URL or just the UUID)
 * - internalName: A descriptive name for the chatflow (used in logs/reports)
 * - conversation: Array of conversation turns
 *
 * Each conversation turn should have:
 * - input: The message/question to send
 * - files: (optional) Array of files to attach to this turn
 *
 * File format:
 * - path: Relative or absolute path to the file
 * - type: MIME type of the file (e.g., 'image/png', 'application/pdf')
 */

module.exports = [
    // Example 1: Simple chat memory test
    {
        id: '12345678-1234-1234-1234-123456789abc',
        internalName: 'Chat Memory Test',
        conversation: [
            {
                input: 'Hello, my name is John Doe, what can you do?',
                files: []
            },
            {
                input: 'What is my name?', // Tests if the chatflow remembers previous context
                files: []
            }
        ]
    },

    // Example 2: Image processing with file upload
    {
        id: '12345678-1234-1234-1234-123456789abc',
        internalName: 'Image Analysis Test',
        conversation: [
            {
                input: 'Hello, I need help analyzing an image.',
                files: []
            },
            {
                input: 'Please describe this image in detail.',
                files: [
                    {
                        path: 'scripts/testing-chatflows/assets/image.png',
                        type: 'image/png'
                    }
                ]
            },
            {
                input: 'What colors are dominant in the image you just analyzed?',
                files: []
            }
        ]
    },

    // Example 3: Vector store/RAG testing
    {
        id: '12345678-1234-1234-1234-123456789abc',
        internalName: 'Knowledge Base Query Test',
        conversation: [
            {
                input: 'What is Answer AI?'
            },
            {
                input: 'Tell me about the key features and capabilities.'
            },
            {
                input: 'How do I get started with creating a sidekick?'
            }
        ]
    },

    // Example 4: Tool usage testing (web search, etc.)
    {
        id: '12345678-1234-1234-1234-123456789abc',
        internalName: 'Web Search Tool Test',
        conversation: [
            {
                input: 'What is the latest news about AI developments?',
                files: []
            },
            {
                input: 'Can you find information about the recent OpenAI announcements?',
                files: []
            }
        ]
    },

    // Example 5: Image generation testing
    {
        id: '12345678-1234-1234-1234-123456789abc',
        internalName: 'Image Generation Test',
        conversation: [
            {
                input: 'Hello, I need you to generate an image for me.',
                files: []
            },
            {
                input: 'Create an image of a serene mountain landscape at sunset with a lake reflection.',
                files: []
            },
            {
                input: 'Can you describe the image you just created?',
                files: []
            }
        ]
    },

    // Example 6: Multi-modal comprehensive test
    {
        id: '12345678-1234-1234-1234-123456789abc',
        internalName: 'Full Multi-Modal Test',
        conversation: [
            {
                input: 'I want to test all your capabilities. Can you create an image first?'
            },
            {
                input: 'Generate a creative image of a futuristic city with flying cars.',
                files: []
            },
            {
                input: 'Now search the web for recent technology news.',
                files: []
            },
            {
                input: 'Here is a document for you to analyze.',
                files: [
                    {
                        path: 'scripts/testing-chatflows/assets/sample_document.pdf',
                        type: 'application/pdf'
                    }
                ]
            },
            {
                input: 'Summarize the document and relate it to the tech news you found.',
                files: []
            },
            {
                input: 'Finally, what was the first image you created in this conversation?',
                files: []
            }
        ]
    },

    // Example 7: Error handling test
    {
        id: '12345678-1234-1234-1234-123456789abc',
        internalName: 'Edge Cases Test',
        conversation: [
            {
                input: '', // Empty input test
                files: []
            },
            {
                input: 'This is a very long input that might test the limits of the system and see how it handles extremely verbose requests that go on and on with lots of details and context that might push the boundaries of what the chatflow can process effectively.',
                files: []
            },
            {
                input: 'Test with special characters: !@#$%^&*()_+{}|:"<>?[]\\;\',./',
                files: []
            }
        ]
    },

    // Example 8: Different file types
    {
        id: '12345678-1234-1234-1234-123456789abc',
        internalName: 'Multiple File Types Test',
        conversation: [
            {
                input: 'I have several files to share with you.',
                files: []
            },
            {
                input: 'First, here is an image.',
                files: [
                    {
                        path: 'scripts/testing-chatflows/assets/image.png',
                        type: 'image/png'
                    }
                ]
            },
            {
                input: 'Now here is a PDF document.',
                files: [
                    {
                        path: 'scripts/testing-chatflows/assets/document.pdf',
                        type: 'application/pdf'
                    }
                ]
            },
            {
                input: 'And finally a text file.',
                files: [
                    {
                        path: 'scripts/testing-chatflows/assets/sample.txt',
                        type: 'text/plain'
                    }
                ]
            },
            {
                input: 'Can you analyze all the files I shared and give me a summary?',
                files: []
            }
        ]
    }
]

// Additional notes:
//
// File paths can be:
// - Relative to the project root: 'scripts/testing-chatflows/assets/image.png'
// - Relative to the script directory: './assets/image.png'
// - Absolute paths: '/full/path/to/file.png'
//
// Supported file types include:
// - Images: image/png, image/jpeg, image/gif, image/webp
// - Documents: application/pdf, text/plain, text/csv
// - Archives: application/zip
// - And many others depending on your chatflow configuration
//
// Tips for creating effective test conversations:
// 1. Test memory by referencing previous messages
// 2. Include edge cases (empty inputs, very long inputs)
// 3. Test file upload capabilities with different file types
// 4. Verify tool usage (web search, image generation, etc.)
// 5. Test multi-turn context retention
// 6. Include error scenarios to test robustness
//
// Command line usage examples:
// - Test all: pnpm test:chatflows --all
// - Test specific: pnpm test:chatflows --ids "Chat Memory,Image Analysis"
// - Verbose mode: pnpm test:chatflows --verbose
// - Save results: pnpm test:chatflows --output results.json
