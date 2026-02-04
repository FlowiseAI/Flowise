import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import dns from 'dns/promises'
import http from 'http'
import https from 'https'
import * as ipaddr from 'ipaddr.js'
import fetch, { RequestInit, Response } from 'node-fetch'

const DEFAULT_DENY_LIST = [
    '0.0.0.0',
    '10.0.0.0/8',
    '127.0.0.0/8',
    '169.254.0.0/16',
    '169.254.169.253',
    '169.254.169.254',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '224.0.0.0/4',
    '240.0.0.0/4',
    '255.255.255.255/32',
    '::1',
    'fc00::/7',
    'fd00:ec2::254',
    'fe80::/10',
    'ff00::/8',
    'localhost',
    'ip6-localhost'
]

/**
 * Gets the HTTP deny list from environment variable or returns default
 * @returns Array of denied IP addresses/CIDR ranges
 */
function getHttpDenyList(): string[] {
    const httpDenyListString = process.env.HTTP_DENY_LIST
    return httpDenyListString ? httpDenyListString.split(',').map((s) => s.trim()) : DEFAULT_DENY_LIST
}

/**
 * Checks if an IP address is in the deny list
 * @param ip - IP address to check
 * @param denyList - Array of denied IP addresses/CIDR ranges
 * @throws Error if IP is in deny list
 */
export function isDeniedIP(ip: string, denyList: string[]): void {
    const parsedIp = ipaddr.parse(ip)
    for (const entry of denyList) {
        if (entry.includes('/')) {
            try {
                const [range, _] = entry.split('/')
                const parsedRange = ipaddr.parse(range)
                if (parsedIp.kind() === parsedRange.kind()) {
                    if (parsedIp.match(ipaddr.parseCIDR(entry))) {
                        throw new Error('Access to this host is denied by policy.')
                    }
                }
            } catch (error) {
                throw new Error(`isDeniedIP: ${error}`)
            }
        } else if (ip === entry) {
            throw new Error('Access to this host is denied by policy.')
        }
    }
}

/**
 * Checks if a URL is allowed based on HTTP_DENY_LIST environment variable.
 * @param url - URL to check
 * @throws Error if URL hostname resolves to a denied IP
 */
export async function checkDenyList(url: string): Promise<void> {
    const httpDenyList = getHttpDenyList()

    const urlObj = new URL(url)
    const hostname = urlObj.hostname

    if (ipaddr.isValid(hostname)) {
        isDeniedIP(hostname, httpDenyList)
    } else {
        const addresses = await dns.lookup(hostname, { all: true })
        for (const address of addresses) {
            isDeniedIP(address.address, httpDenyList)
        }
    }
}

/**
 * Makes a secure HTTP request that validates all URLs in redirect chains against the deny list
 * @param config - Axios request configuration
 * @param maxRedirects - Maximum number of redirects to follow (default: 5)
 * @returns Promise<AxiosResponse>
 * @throws Error if any URL in the redirect chain is denied
 */
export async function secureAxiosRequest(config: AxiosRequestConfig, maxRedirects: number = 5): Promise<AxiosResponse> {
    let currentUrl = config.url
    if (!currentUrl) {
        throw new Error('secureAxiosRequest: url is required')
    }

    let redirects = 0
    let currentConfig = { ...config, maxRedirects: 0 } // Disable automatic redirects

    while (redirects <= maxRedirects) {
        const target = await resolveAndValidate(currentUrl)
        const agent = createPinnedAgent(target)

        currentConfig = {
            ...currentConfig,
            url: currentUrl,
            ...(target.protocol === 'http' ? { httpAgent: agent } : { httpsAgent: agent }),
            headers: {
                ...currentConfig.headers,
                Host: target.hostname
            }
        }

        const response = await axios(currentConfig)

        // If it's a successful response (not a redirect), return it
        if (response.status < 300 || response.status >= 400) {
            return response
        }

        // Handle redirect
        const location = response.headers.location
        if (!location) {
            // No location header, but it's a redirect status - return the response
            return response
        }

        redirects++
        if (redirects > maxRedirects) {
            throw new Error('Too many redirects')
        }

        currentUrl = new URL(location, currentUrl).toString()

        // For redirects, we only need to preserve certain headers and change method if needed
        if (response.status === 301 || response.status === 302 || response.status === 303) {
            // For 303, or when redirecting POST requests, change to GET
            if (
                response.status === 303 ||
                (currentConfig.method && ['POST', 'PUT', 'PATCH'].includes(currentConfig.method.toUpperCase()))
            ) {
                currentConfig.method = 'GET'
                delete currentConfig.data
            }
        }
    }

    throw new Error('Too many redirects')
}

/**
 * Makes a secure fetch request that validates all URLs in redirect chains against the deny list
 * @param url - URL to fetch
 * @param init - Fetch request options
 * @param maxRedirects - Maximum number of redirects to follow (default: 5)
 * @returns Promise<Response>
 * @throws Error if any URL in the redirect chain is denied
 */
export async function secureFetch(url: string, init?: RequestInit, maxRedirects: number = 5): Promise<Response> {
    let currentUrl = url
    let redirectCount = 0
    let currentInit = { ...init, redirect: 'manual' as const } // Disable automatic redirects

    while (redirectCount <= maxRedirects) {
        const resolved = await resolveAndValidate(currentUrl)
        const agent = createPinnedAgent(resolved)

        const response = await fetch(currentUrl, { ...currentInit, agent: () => agent })

        // If it's a successful response (not a redirect), return it
        if (response.status < 300 || response.status >= 400) {
            return response
        }

        // Handle redirect
        const location = response.headers.get('location')
        if (!location) {
            // No location header, but it's a redirect status - return the response
            return response
        }

        redirectCount++

        if (redirectCount > maxRedirects) {
            throw new Error('Too many redirects')
        }

        // Resolve the redirect URL (handle relative URLs)
        currentUrl = new URL(location, currentUrl).toString()

        // Handle method changes for redirects according to HTTP specs
        if (response.status === 301 || response.status === 302 || response.status === 303) {
            // For 303, or when redirecting POST/PUT/PATCH requests, change to GET
            if (response.status === 303 || (currentInit.method && ['POST', 'PUT', 'PATCH'].includes(currentInit.method.toUpperCase()))) {
                currentInit = {
                    ...currentInit,
                    method: 'GET',
                    body: undefined
                }
            }
        }
    }

    throw new Error('Too many redirects')
}

type ResolvedTarget = {
    hostname: string
    ip: string
    family: 4 | 6
    protocol: 'http' | 'https'
}

async function resolveAndValidate(url: string): Promise<ResolvedTarget> {
    const denyList = getHttpDenyList()

    const u = new URL(url)
    const hostname = u.hostname
    const protocol: 'http' | 'https' = u.protocol === 'https:' ? 'https' : 'http'

    if (ipaddr.isValid(hostname)) {
        isDeniedIP(hostname, denyList)

        return {
            hostname,
            ip: hostname,
            family: hostname.includes(':') ? 6 : 4,
            protocol
        }
    }

    const records = await dns.lookup(hostname, { all: true })
    if (records.length === 0) {
        throw new Error(`DNS resolution failed for ${hostname}`)
    }

    for (const r of records) {
        isDeniedIP(r.address, denyList)
    }

    const chosen = records.find((r) => r.family === 4) ?? records[0]

    return {
        hostname,
        ip: chosen.address,
        family: chosen.family as 4 | 6,
        protocol
    }
}

function createPinnedAgent(target: ResolvedTarget): http.Agent | https.Agent {
    const Agent = target.protocol === 'https' ? https.Agent : http.Agent

    return new Agent({
        lookup: (_host, _opts, cb) => {
            cb(null, target.ip, target.family)
        }
    })
}
