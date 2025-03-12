import dotenv from 'dotenv'
import path from 'path'

const envPath = path.join(__dirname, '..', '..', '.env')
dotenv.config({ path: envPath, override: true })

export * from './Interface'
export * from './utils'
export * from './speechToText'
export * from './storageUtils'
export * from './handler'
export * from './followUpPrompts'
