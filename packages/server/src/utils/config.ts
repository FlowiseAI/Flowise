import * as path from 'path'
import * as fs from 'fs'

// should be config via .env or config file
const logDir = path.join(__dirname, '../../../..', 'logs')

// Create the log directory if it doesn't exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir)
}

console.info('Defined logDir:', logDir, ' in ' + __filename)

export const config = {
    logLevel: 'info', // Set your desired log level
    logDir: logDir
}

export default config
