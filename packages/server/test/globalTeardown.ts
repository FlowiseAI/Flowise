import { getInstance } from '../src'

module.exports = async () => {
    console.log('Stopping server...')
    try {
        const app = getInstance()
        if (app) {
            await app.stopApp()
            console.log('Server stopped')
        }
    } catch (error) {
        console.error('Failed to stop server:', error)
        throw error
    }
}
