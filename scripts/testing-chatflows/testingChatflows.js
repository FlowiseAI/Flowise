// This script is used to test the chatflows API with a chatflowid csv file automatically. It should be able to run the csv file as line separated chatflowids or comma separated chatflowids.

const fs = require('fs')
const path = require('path')
const axios = require('axios')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option('csv', {
        alias: 'c',
        description: 'Path to CSV file',
        type: 'string',
        default: path.join(__dirname, 'chatflows.csv')
    })
    .option('no-delay', {
        description: 'Disable delay between requests',
        type: 'boolean',
        default: false
    })
    .option('retries', {
        alias: 'r',
        description: 'Number of retries for failed requests',
        type: 'number',
        default: 2
    })
    .option('timeout', {
        alias: 't',
        description: 'Request timeout in milliseconds',
        type: 'number',
        default: 30000
    })
    .option('output', {
        alias: 'o',
        description: 'Output file path for results',
        type: 'string'
    })
    .option('verbose', {
        alias: 'v',
        description: 'Run with verbose logging',
        type: 'boolean',
        default: false
    })
    .help()
    .alias('help', 'h').argv

// Utility function to create delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Utility function to format duration
const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
}

async function testChatflow(chatflowId, retryCount = 0) {
    const startTime = Date.now()
    try {
        const response = await axios.post(
            `${process.env.TESTING_CHATFLOWS_API_URL}/${chatflowId}`,
            { question: process.env.TESTING_CHATFLOWS_QUESTION },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.TESTING_CHATFLOWS_AUTH_TOKEN}`
                },
                timeout: argv.timeout
            }
        )
        return {
            success: true,
            chatflowId,
            response: response.data,
            duration: Date.now() - startTime
        }
    } catch (error) {
        if (retryCount < argv.retries) {
            if (argv.verbose) {
                console.log(`⚠️  Retrying ${chatflowId} (attempt ${retryCount + 1}/${argv.retries})`)
            }
            await sleep(1000 * (retryCount + 1)) // Exponential backoff
            return testChatflow(chatflowId, retryCount + 1)
        }
        return {
            success: false,
            chatflowId,
            error: error.response?.data || error.message,
            duration: Date.now() - startTime
        }
    }
}

async function main() {
    try {
        // Validate required environment variables
        const requiredEnvVars = [
            'TESTING_CHATFLOWS_API_URL',
            'TESTING_CHATFLOWS_AUTH_TOKEN',
            'TESTING_CHATFLOWS_QUESTION',
            'TESTING_CHATFLOWS_REQUEST_DELAY_MS'
        ]

        const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName])
        if (missingEnvVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
        }

        // Read and parse CSV file
        const csvPath = argv.csv
        const csvContent = fs.readFileSync(csvPath, 'utf-8')
        const chatflowIds = csvContent
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'))

        console.log('🚀 Starting chatflow testing...\n')
        console.log(`📊 Total chatflows to test: ${chatflowIds.length}`)
        console.log(`⏱️  Delay between requests: ${argv['no-delay'] ? 'disabled' : process.env.TESTING_CHATFLOWS_REQUEST_DELAY_MS + 'ms'}`)
        console.log(`🔄 Retry attempts: ${argv.retries}`)
        console.log(`⏳ Request timeout: ${argv.timeout}ms\n`)

        const results = []
        const startTime = Date.now()

        // Test each chatflow
        for (let i = 0; i < chatflowIds.length; i++) {
            const chatflowId = chatflowIds[i]
            if (argv.verbose) {
                console.log(`\n📝 Testing chatflow ${i + 1}/${chatflowIds.length}`)
                console.log(`ID: ${chatflowId}`)
            }

            const result = await testChatflow(chatflowId)
            results.push(result)

            if (argv.verbose) {
                if (result.success) {
                    console.log('✅ Success!')
                    console.log('Response:', JSON.stringify(result.response, null, 2))
                } else {
                    console.log('❌ Error:')
                    console.log('Error details:', JSON.stringify(result.error, null, 2))
                }
                console.log(`⏱️  Duration: ${formatDuration(result.duration)}`)
                console.log('----------------------------------------')
            } else {
                process.stdout.write(result.success ? '✅' : '❌')
            }

            // Add delay between requests (except for the last request)
            if (!argv['no-delay'] && i < chatflowIds.length - 1) {
                await sleep(parseInt(process.env.TESTING_CHATFLOWS_REQUEST_DELAY_MS))
            }
        }

        // Generate summary
        const totalDuration = Date.now() - startTime
        const successful = results.filter((r) => r.success).length
        const failed = results.filter((r) => !r.success).length
        const avgDuration = results.reduce((acc, r) => acc + r.duration, 0) / results.length
        const failedChatflows = results
            .filter((r) => !r.success)
            .map((r) => ({
                id: r.chatflowId,
                error: r.error
            }))

        console.log('\n\n📊 Summary:')
        console.log(`Total tests: ${results.length}`)
        console.log(`Successful: ${successful}`)
        console.log(`Failed: ${failed}`)
        console.log(`Success rate: ${((successful / results.length) * 100).toFixed(1)}%`)
        console.log(`Average duration: ${formatDuration(avgDuration)}`)
        console.log(`Total duration: ${formatDuration(totalDuration)}`)

        if (failed > 0) {
            console.log('\n❌ Failed Chatflows:')
            failedChatflows.forEach(({ id, error }) => {
                console.log(`\nID: ${id}`)
                console.log('Error:', typeof error === 'string' ? error : JSON.stringify(error, null, 2))
            })
        }

        // Save results if output file specified
        if (argv.output) {
            const outputPath = path.resolve(process.cwd(), argv.output)
            fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
            console.log(`\n💾 Results saved to: ${outputPath}`)
        }

        // Exit with error if any tests failed
        if (failed > 0) {
            process.exit(1)
        }
    } catch (error) {
        console.error('❌ Fatal error:', error.message)
        process.exit(1)
    }
}

main()
