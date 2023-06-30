// BEWARE: This file is an intereem solution until we have a proper config strategy

import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: true })

// default config
const loggingConfig = {
    dir: process.env.LOG_PATH ?? './logs',
    server: {
        level: 'info',
        filename: 'server.log',
        errorFilename: 'server-error.log'
    },
    express: {
        level: 'info',
        format: 'jsonl', // can't be changed currently
        filename: 'server-requests.log.jsonl' // should end with .jsonl
    }
}

export default {
    logging: loggingConfig
}
