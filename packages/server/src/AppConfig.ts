export const appConfig = {
    apiKeys: {
        storageType: process.env.APIKEY_STORAGE_TYPE ? process.env.APIKEY_STORAGE_TYPE.toLowerCase() : 'json'
    }
    // todo: add more config options here like database, log, storage, credential and allow modification from UI
}
