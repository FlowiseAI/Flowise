const assert = require('assert')
const { parsePrompt } = require('../../dist/utils/hub')

// Test: Parse system message prompts correctly
const testSystemMessagePrompt = () => {
    const prompt = JSON.stringify({
        kwargs: {
            messages: [
                {
                    id: 'SystemMessagePromptTemplate1',
                    kwargs: {
                        prompt: {
                            kwargs: {
                                template: 'System message template'
                            }
                        }
                    }
                }
            ]
        }
    })

    const result = parsePrompt(prompt)
    const expected = [
        {
            type: 'systemMessagePrompt',
            typeDisplay: 'System Message',
            template: 'System message template'
        }
    ]
    assert.deepStrictEqual(result, expected)
    console.log('Test passed: System message prompt')
}

// Test: Parse human message prompts correctly
const testHumanMessagePrompt = () => {
    const prompt = JSON.stringify({
        kwargs: {
            messages: [
                {
                    id: 'HumanMessagePromptTemplate1',
                    kwargs: {
                        prompt: {
                            kwargs: {
                                template: 'Human message template'
                            }
                        }
                    }
                }
            ]
        }
    })

    const result = parsePrompt(prompt)
    const expected = [
        {
            type: 'humanMessagePrompt',
            typeDisplay: 'Human Message',
            template: 'Human message template'
        }
    ]
    assert.deepStrictEqual(result, expected)
    console.log('Test passed: Human message prompt')
}

// Test: Parse AI message prompts correctly
const testAIMessagePrompt = () => {
    const prompt = JSON.stringify({
        kwargs: {
            messages: [
                {
                    id: 'AIMessagePromptTemplate1',
                    kwargs: {
                        prompt: {
                            kwargs: {
                                template: 'AI message template'
                            }
                        }
                    }
                }
            ]
        }
    })

    const result = parsePrompt(prompt)
    const expected = [
        {
            type: 'aiMessagePrompt',
            typeDisplay: 'AI Message',
            template: 'AI message template'
        }
    ]
    assert.deepStrictEqual(result, expected)
    console.log('Test passed: AI message prompt')
}

// Test: Parse template prompts correctly
const testTemplatePrompt = () => {
    const prompt = JSON.stringify({
        kwargs: {
            template: 'General template'
        }
    })

    const result = parsePrompt(prompt)
    const expected = [
        {
            type: 'template',
            typeDisplay: 'Prompt',
            template: 'General template'
        }
    ]
    assert.deepStrictEqual(result, expected)
    console.log('Test passed: Template prompt')
}

// Test: Handle empty messages array
const testEmptyMessages = () => {
    const prompt = JSON.stringify({
        kwargs: {
            messages: []
        }
    })

    const result = parsePrompt(prompt)
    const expected = []
    assert.deepStrictEqual(result, expected)
    console.log('Test passed: Empty messages array')
}

// Run all tests
const runTests = () => {
    testSystemMessagePrompt()
    testHumanMessagePrompt()
    testAIMessagePrompt()
    testTemplatePrompt()
    testEmptyMessages()
}

runTests()
