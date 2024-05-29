const assert = require('assert')
const path = require('path')

// Mock dotenv to control the environment variables for testing
require('dotenv').config = ({ path, override }) => {
    process.env.LOG_PATH = '/custom/log/path'
    process.env.LOG_LEVEL = 'debug'
}

// Mocked path join to control paths for testing
const originalPathJoin = path.join
path.join = (...args) => {
    if (args.includes('logs')) {
        return '/default/log/path'
    }
    return originalPathJoin(...args)
}

// Import the configuration module
const config = require('../../dist/utils/config').default

// Restore path.join after the test
path.join = originalPathJoin

// Test cases
function testLoggingConfig() {
    const loggingConfig = config.logging

    // Check if LOG_PATH environment variable is considered
    assert.strictEqual(loggingConfig.dir, '/custom/log/path', 'Logging directory should match the LOG_PATH environment variable')

    // Check if LOG_LEVEL environment variable is considered
    assert.strictEqual(loggingConfig.server.level, 'debug', 'Server log level should match the LOG_LEVEL environment variable')
    assert.strictEqual(loggingConfig.express.level, 'debug', 'Express log level should match the LOG_LEVEL environment variable')

    // Check the default filenames
    assert.strictEqual(loggingConfig.server.filename, 'server.log', 'Server log filename should be server.log')
    assert.strictEqual(loggingConfig.server.errorFilename, 'server-error.log', 'Server error log filename should be server-error.log')
    assert.strictEqual(
        loggingConfig.express.filename,
        'server-requests.log.jsonl',
        'Express log filename should be server-requests.log.jsonl'
    )

    console.log('All config tests passed')
}

// Run the tests
testLoggingConfig()
