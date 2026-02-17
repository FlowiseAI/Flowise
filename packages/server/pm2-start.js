// PM2 entry point for DK-Platform
// Directly imports and runs the server start sequence

const DataSource = require('./dist/DataSource')
const Server = require('./dist/index')

async function startServer() {
    console.log('Starting DK-Platform Server...')
    await DataSource.init()
    await Server.start()
}

startServer().catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
})
