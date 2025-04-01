import axios from 'axios'

const waitForServer = async (port: number, maxAttempts = 10, interval = 1000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await axios.get(`http://localhost:${port}/api/v1/ping`)
            console.log(`Server is ready on port ${port}`)
            return true
        } catch (error) {
            console.log(`Waiting for server (attempt ${attempt}/${maxAttempts})...`)
            await new Promise((resolve) => setTimeout(resolve, interval))
        }
    }
    throw new Error(`Server failed to start after ${maxAttempts} attempts`)
}

module.exports = async () => {
    // Start the server
    // console.log('Starting server for tests...')
    try {
        // Set test port
        process.env.PORT = '4000'

        // Start server
        // await start()
        // console.log('Server started, waiting for it to be ready...')

        // Wait for server to be ready
        await waitForServer(4000)

        console.log('Server is ready for tests')
    } catch (error) {
        console.error('Failed to start server:', error)
        throw error
    }
}
