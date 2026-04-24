#!/usr/bin/env node
/**
 * Interactive Okta OAuth2 authorization-code + PKCE token helper.
 *
 * Usage:
 *   OKTA_CLIENT_ID=0oa... OKTA_REDIRECT_URI=http://localhost:8080/login/callback \
 *   OKTA_SCOPES='openid profile email offline_access flowise.chatflows.read' \
 *   (use only scopes that exist on your Okta authorization server; audience ≠ scope) \
 *   node scripts/okta-pkce-token.mjs
 *
 * Opens instructions: visit the printed URL, sign in, approve; this script
 * receives the redirect on OKTA_REDIRECT_URI (must match Okta app config exactly).
 */
import http from 'http'
import crypto from 'crypto'
import { URL, URLSearchParams } from 'url'

const issuer = (process.env.OKTA_ISSUER || 'https://trial-8506244.okta.com/oauth2/aus1254yvdqd9l7hv698').replace(/\/$/, '')
const clientId = process.env.OKTA_CLIENT_ID || '0oa126hlw36cqnhlD698'
const redirectUri = process.env.OKTA_REDIRECT_URI || 'http://localhost:8080/login/callback'
const scopes = process.env.OKTA_SCOPES || 'openid profile email offline_access'
const listenPort = Number(process.env.OKTA_CALLBACK_PORT || new URL(redirectUri).port || 8080)
const listenPath = new URL(redirectUri).pathname || '/login/callback'

function base64Url(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomVerifier() {
    return base64Url(crypto.randomBytes(32))
}

function challengeFromVerifier(verifier) {
    return base64Url(crypto.createHash('sha256').update(verifier).digest())
}

function discover() {
    return fetch(`${issuer}/.well-known/openid-configuration`).then((r) => r.json())
}

async function exchangeToken(meta, { code, codeVerifier, redirectUri }) {
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier
    })
    const res = await fetch(meta.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    })
    const text = await res.text()
    let json
    try {
        json = JSON.parse(text)
    } catch {
        throw new Error(`Token response ${res.status}: ${text}`)
    }
    if (!res.ok) throw new Error(JSON.stringify(json, null, 2))
    return json
}

async function callUserInfo(meta, accessToken) {
    if (!meta.userinfo_endpoint) return null
    const res = await fetch(meta.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
    return res.json()
}

async function main() {
    const meta = await discover()
    const codeVerifier = randomVerifier()
    const codeChallenge = challengeFromVerifier(codeVerifier)
    const state = base64Url(crypto.randomBytes(16))

    const authUrl = new URL(meta.authorization_endpoint)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    console.log('\n1) Open this URL in your browser and sign in:\n')
    console.log(authUrl.toString())
    console.log(`\n2) Waiting for redirect to ${redirectUri} (state=${state}) ...\n`)

    const tokenJson = await new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            try {
                const u = new URL(req.url || '', `http://127.0.0.1:${listenPort}`)
                if (u.pathname !== listenPath) {
                    res.writeHead(404)
                    res.end('not found')
                    return
                }
                const err = u.searchParams.get('error')
                if (err) {
                    res.writeHead(400)
                    res.end(`Okta error: ${err} ${u.searchParams.get('error_description') || ''}`)
                    reject(new Error(u.searchParams.toString()))
                    server.close()
                    return
                }
                const code = u.searchParams.get('code')
                const returned = u.searchParams.get('state')
                if (returned !== state) {
                    res.writeHead(400)
                    res.end('state mismatch')
                    reject(new Error('state mismatch'))
                    server.close()
                    return
                }
                if (!code) {
                    res.writeHead(400)
                    res.end('missing code')
                    reject(new Error('missing code'))
                    server.close()
                    return
                }
                res.writeHead(200, { 'Content-Type': 'text/html' })
                res.end('<html><body>You can close this tab.</body></html>')
                server.close()
                exchangeToken(meta, { code, codeVerifier, redirectUri }).then(resolve).catch(reject)
            } catch (e) {
                reject(e)
                server.close()
            }
        })
        server.listen(listenPort, '127.0.0.1', () => {
            console.log(`Listening on http://127.0.0.1:${listenPort}${listenPath}`)
        })
        server.on('error', reject)
    })

    console.log('\n--- Access token (first 60 chars) ---\n')
    console.log(String(tokenJson.access_token).slice(0, 60) + '...')
    if (tokenJson.refresh_token) console.log('\n(refresh_token received)\n')

    const ui = await callUserInfo(meta, tokenJson.access_token)
    console.log('\n--- UserInfo (REST) ---\n')
    console.log(JSON.stringify(ui, null, 2))

    console.log('\n--- Test Flowise (optional) ---\n')
    console.log(`curl -sS -H "Authorization: Bearer ${tokenJson.access_token}" "http://localhost:3000/api/v1/chatflows" | head -c 400\n`)
}

main().catch((e) => {
    console.error(e.message || e)
    process.exit(1)
})
