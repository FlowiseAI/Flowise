require('dotenv').config()
const flowise = require('flowise')

flowise.start({
    PORT: process.env.PORT,
    DEBUG: process.env.DEBUG === 'true',
    DATABASE_PATH: process.env.DATABASE_PATH,
    APIKEY_PATH: process.env.APIKEY_PATH,
    SECRETKEY_PATH: process.env.SECRETKEY_PATH,
    LOG_PATH: process.env.LOG_PATH,
    BLOB_STORAGE_PATH: process.env.BLOB_STORAGE_PATH,
    SHOW_COMMUNITY_NODES: process.env.SHOW_COMMUNITY_NODES
})
