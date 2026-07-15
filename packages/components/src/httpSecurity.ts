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
 * Gets the HTTP deny list.
 * When HTTP_SECURITY_CHECK=false, the default deny list is omitted and only
 * HTTP_DENY_LIST entries are used. Defaults to true (secure).
 * @returns Array of denied IP addresses, hostnames, or CIDR ranges
 */
function getHttpDenyList(): string[] {
    const securityCheckEnabled = process.env.HTTP_SECURITY_CHECK !== 'false'
    const httpDenyListString = process.env.HTTP_DENY_LIST
    const customList = httpDenyListString
        ? httpDenyListString
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
        : []

    if (securityCheckEnabled) {
        return [...new Set([...DEFAULT_DENY_LIST, ...customList])]
    }
    return customList
}

/**
 * Gets the HTTP allow list from HTTP_ALLOW_LIST env variable.
 * Hostnames in this list bypass the deny list check, allowing connections to
 * internal services (e.g. Docker Compose siblings) without disabling SSRF
 * protection globally. Entries are exact hostname matches (no wildcards) and
 * are normalized to lowercase to align with URL hostname parsing.
 *
 * Common formats users copy from connection strings are normalized before
 * matching so they line up with the hostname the URL parser produces:
 *  - `host:port` → `host` (port stripped; the allow list is hostname-scoped)
 *  - `[::1]` / `[::1]:8080` → `::1` (IPv6 brackets stripped, port stripped)
 *  - bare IPv4/IPv6 (e.g. `172.18.0.2`, `fe80::1`) are left as-is
 *
 * @returns Array of hostnames explicitly allowed
 */
function getHttpAllowList(): string[] {
    const raw = process.env.HTTP_ALLOW_LIST
    if (!raw) return []
    return raw
        .split(',')
        .map((s) => {
            let trimmed = s.trim().toLowerCase()
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                // Bracketed IPv6 with no port: [::1]
                trimmed = trimmed.slice(1, -1)
            } else if (trimmed.startsWith('[') && trimmed.includes(']')) {
                // Bracketed IPv6 with port: [::1]:8080
                const closeBracketIndex = trimmed.indexOf(']')
                trimmed = trimmed.slice(1, closeBracketIndex)
            } else if (!ipaddr.isValid(trimmed) && trimmed.includes(':')) {
                // hostname:port or ipv4:port — the isValid guard avoids
                // truncating bare IPv6 addresses like fe80::1
                const parts = trimmed.split(':')
                if (parts.length === 2) {
                    trimmed = parts[0]
                }
            }
            return trimmed
        })
        .filter(Boolean)
}

/**
 * Checks if an IP address is in the deny list
 * @param ip - IP address to check
 * @param denyList - Array of denied IP addresses/CIDR ranges
 * @throws Error if IP is in deny list
 */
export function isDeniedIP(ip: string, denyList: string[]): void {
    let parsedIp = ipaddr.parse(ip)

    // Normalize IPv4-mapped IPv6 addresses to IPv4 before checking
    // This prevents bypass of IPv4 deny list rules via ::ffff:x.x.x.x addresses
    if (parsedIp.kind() === 'ipv6') {
        const ipv6Addr = parsedIp as ipaddr.IPv6
        if (ipv6Addr.isIPv4MappedAddress()) {
            parsedIp = ipv6Addr.toIPv4Address()
        }
    }

    for (const entry of denyList) {
        if (entry.includes('/')) {
            try {
                const [rangeAddr, mask] = ipaddr.parseCIDR(entry)
                let parsedRange = rangeAddr
                let adjustedMask = mask

                // Also normalize deny list entries
                if (parsedRange.kind() === 'ipv6' && (parsedRange as ipaddr.IPv6).isIPv4MappedAddress()) {
                    if (mask < 96) continue // malformed IPv4-mapped CIDR — skip
                    parsedRange = (parsedRange as ipaddr.IPv6).toIPv4Address()
                    adjustedMask -= 96
                }

                if (parsedIp.kind() === parsedRange.kind()) {
                    if (parsedIp.match(parsedRange, adjustedMask)) {
                        throw new Error('Access to this host is denied by policy.')
                    }
                }
            } catch (error) {
                throw new Error(`isDeniedIP: ${error}`)
            }
        } else {
            // Try to parse and normalize the deny list entry for consistent comparison
            // This handles non-canonical IPv6 addresses (e.g., FE80::1, 2001:0DB8::1)
            if (ipaddr.isValid(entry)) {
                let parsedEntry = ipaddr.parse(entry)

                // Normalize IPv4-mapped IPv6 entries
                if (parsedEntry.kind() === 'ipv6' && (parsedEntry as ipaddr.IPv6).isIPv4MappedAddress()) {
                    parsedEntry = (parsedEntry as ipaddr.IPv6).toIPv4Address()
                }

                // Compare normalized forms
                if (parsedIp.toString() === parsedEntry.toString()) {
                    throw new Error('Access to this host is denied by policy.')
                }
            } else {
                // Not a valid IP - compare as-is (e.g., hostname like "localhost")
                if (parsedIp.toString() === entry) {
                    throw new Error('Access to this host is denied by policy.')
                }
            }
        }
    }
}

/**
 * Checks if a URL is allowed based on HTTP_DENY_LIST / HTTP_ALLOW_LIST environment variables.
 * Hostnames present in HTTP_ALLOW_LIST bypass the deny list entirely, which lets
 * Docker-internal or other trusted private services connect without disabling
 * global SSRF protection via HTTP_SECURITY_CHECK=false.
 * @param url - URL to check
 * @throws Error if URL hostname resolves to a denied IP
 */
export async function checkDenyList(url: string): Promise<void> {
    const httpDenyList = getHttpDenyList()
    const httpAllowList = getHttpAllowList()

    const urlObj = new URL(url)
    let hostname = urlObj.hostname
    // Strip IPv6 brackets if present
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
        hostname = hostname.slice(1, -1)
    }

    // Explicitly allowed hostnames bypass the deny list
    if (httpAllowList.includes(hostname)) return

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
 * Optional TLS options for secureAxiosRequest (e.g. custom CA for mutual TLS or private CAs).
 */
export interface SecureRequestAgentOptions {
    ca?: string | string[] | Buffer
}

/**
 * Makes a secure HTTP request that validates all URLs in redirect chains against the deny list
 * @param config - Axios request configuration (httpsAgent/httpAgent are ignored; use agentOptions for custom CA)
 * @param maxRedirects - Maximum number of redirects to follow (default: 5)
 * @param agentOptions - Optional TLS options (e.g. { ca } for custom CA PEM)
 * @returns Promise<AxiosResponse>
 * @throws Error if any URL in the redirect chain is denied
 */
export async function secureAxiosRequest(
    config: AxiosRequestConfig,
    maxRedirects: number = 5,
    agentOptions?: SecureRequestAgentOptions
): Promise<AxiosResponse> {
    let currentUrl = config.url
    if (!currentUrl) {
        throw new Error('secureAxiosRequest: url is required')
    }

    let redirects = 0
    let currentConfig: AxiosRequestConfig = {
        ...config,
        maxRedirects: 0,
        validateStatus: () => true,
        httpsAgent: undefined,
        httpAgent: undefined
    } // Disable automatic redirects; agents set per-request below

    while (redirects <= maxRedirects) {
        const target = await resolveAndValidate(currentUrl)
        const agent = createPinnedAgent(target, agentOptions)

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
 * @param agentOptions - Optional TLS options (e.g. { ca } for custom CA PEM)
 * @returns Promise<Response>
 * @throws Error if any URL in the redirect chain is denied
 */
export async function secureFetch(
    url: string,
    init?: RequestInit,
    maxRedirects: number = 5,
    agentOptions?: SecureRequestAgentOptions
): Promise<Response> {
    let currentUrl = url
    let redirectCount = 0
    let currentInit = { ...init, redirect: 'manual' as const } // Disable automatic redirects

    while (redirectCount <= maxRedirects) {
        const resolved = await resolveAndValidate(currentUrl)
        const agent = createPinnedAgent(resolved, agentOptions)

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
    const allowList = getHttpAllowList()

    const u = new URL(url)
    let hostname = u.hostname
    // Strip IPv6 brackets if present
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
        hostname = hostname.slice(1, -1)
    }
    const protocol: 'http' | 'https' = u.protocol === 'https:' ? 'https' : 'http'

    // Explicitly allowed hostnames bypass the deny list
    const isAllowed = allowList.includes(hostname)

    if (ipaddr.isValid(hostname)) {
        if (!isAllowed) isDeniedIP(hostname, denyList)
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

    if (!isAllowed) {
        for (const r of records) {
            isDeniedIP(r.address, denyList)
        }
    }

    const chosen = records.find((r) => r.family === 4) ?? records[0]

    return {
        hostname,
        ip: chosen.address,
        family: chosen.family as 4 | 6,
        protocol
    }
}

function createPinnedAgent(target: ResolvedTarget, options?: { ca?: string | string[] | Buffer }): http.Agent | https.Agent {
    const Agent = target.protocol === 'https' ? https.Agent : http.Agent

    return new Agent({
        lookup: (_host, _opts, cb) => {
            cb(null, target.ip, target.family)
        },
        ...options
    })
}
