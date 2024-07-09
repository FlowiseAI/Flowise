export const APIKEYS_STORAGE_JSON = !process.env.APIKEY_STORAGE_TYPE || process.env.APIKEY_STORAGE_TYPE === 'json'
export const APIKEYS_STORAGE_DB =
    process.env.APIKEY_STORAGE_TYPE === 'db' || process.env.APIKEY_STORAGE_TYPE === 'DB' || process.env.APIKEY_STORAGE_TYPE === 'Db'
