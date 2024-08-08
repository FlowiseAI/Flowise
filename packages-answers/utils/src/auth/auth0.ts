// utils/auth0.js
import { initAuth0 } from '@auth0/nextjs-auth0'

export default initAuth0({
    // secret: 'LONG_RANDOM_VALUE',
    // issuerBaseURL: 'https://your-tenant.auth0.com',
    // baseURL: 'http://localhost:3000',
    // clientID: 'CLIENT_ID',
    // clientSecret: 'CLIENT_SECRET'
    secret: process.env.AUTH0_SECRET,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    baseURL: process.env.AUTH0_BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    idTokenSigningAlg: process.env.AUTH0_TOKEN_SIGN_ALG
    // session: {
    //   cookie: {
    //     domain: process.env.AUTH0_COOKIE_DOMAIN ?? 'https://theanswer.ai'
    //   }
    // }
})
