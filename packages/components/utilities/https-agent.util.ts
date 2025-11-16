import https from 'node:https'

export const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    requestCert: false
})
