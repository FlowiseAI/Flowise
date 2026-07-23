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
 * A parsed HTTP_ALLOW_LIST entry.
 *
 * - `protocol` is set only when the rule explicitly includes `http://` or `https://`.
 *   Scheme-less rules match either protocol.
 * - `port` is set when the rule pins a specific port (either an explicit protocol,
 *   whose default port is derived, or a scheme-less rule with an explicit `:port`).
 *   Undefined `port` means any port is accepted.
 * - `pathname` is `/` for rules without a path, otherwise the path prefix (matched
 *   at path-segment boundaries — see `isPathAllowed`).
 */
export interface HttpAllowRule {
    protocol?: 'http:' | 'https:'
    hostname: string
    port?: string
    pathname: string
}

function normalizeHostname(hostname: string): string {
    let normalized = hostname.trim().toLowerCase()

    // URL.hostname may retain brackets around IPv6 addresses.
    if (normalized.startsWith('[') && normalized.endsWith(']')) {
        normalized = normalized.slice(1, -1)
    }

    // Treat fully qualified names with trailing dots as equivalent.
    if (normalized.endsWith('.')) {
        normalized = normalized.slice(0, -1)
    }

    return normalized
}

function normalizePathname(pathname: string): string {
    if (!pathname || pathname === '/') return '/'
    const normalized = pathname.replace(/\/+$/, '')
    return normalized || '/'
}

function getEffectiveHttpPort(url: URL): string | null {
    if (url.protocol === 'http:') return url.port || '80'
    if (url.protocol === 'https:') return url.port || '443'
    return null
}

function isPathAllowed(targetPathname: string, allowedPathname: string): boolean {
    const target = normalizePathname(targetPathname)
    const allowed = normalizePathname(allowedPathname)

    // A rule without a path allows every path on the destination.
    if (allowed === '/') return true

    // Require a path-segment boundary so a rule for "/mcp" does not also allow "/mcp-admin".
    return target === allowed || target.startsWith(`${allowed}/`)
}

function hasExplicitHttpProtocol(entry: string): boolean {
    const normalized = entry.toLowerCase()
    return normalized.startsWith('http://') || normalized.startsWith('https://')
}

function hasExplicitPort(entry: string): boolean {
    // Only used for entries without a protocol. Extract the authority before any path, query, or fragment.
    const authority = entry.split(/[/?#]/, 1)[0]

    if (authority.startsWith('[')) {
        const closingBracketIndex = authority.indexOf(']')
        if (closingBracketIndex === -1) return false
        const remainder = authority.slice(closingBracketIndex + 1)
        return remainder.startsWith(':') && remainder.length > 1
    }

    const colonIndex = authority.lastIndexOf(':')
    return colonIndex !== -1 && colonIndex < authority.length - 1
}

/**
 * Parses a single HTTP_ALLOW_LIST entry. Returns null for empty, malformed, or
 * unsupported entries (non-http/https protocol, credentials, query/fragment) —
 * such entries silently grant no access. Callers should validate user input at
 * submission or startup so bad entries can be reported.
 *
 * Supported entry shapes:
 *   example.internal
 *   example.internal:8080
 *   example.internal/mcp
 *   example.internal:8080/mcp
 *   10.20.30.40
 *   10.20.30.40:8080/mcp
 *   [fd00::1]:8080/mcp
 *   http://example.internal:8080/mcp
 *   https://example.internal/mcp
 */
export function parseHttpAllowRule(entry: string): HttpAllowRule | null {
    const trimmed = entry.trim()
    if (!trimmed) return null

    const hasExplicitProtocol = hasExplicitHttpProtocol(trimmed)

    // Bare IPv4/IPv6 (no port, no path) — canonicalize so equivalent representations match.
    // For example, "0:0:0:0:0:0:0:1" and "::1" normalize to the same value.
    if (!hasExplicitProtocol && ipaddr.isValid(trimmed)) {
        return {
            hostname: ipaddr.parse(trimmed).toString().toLowerCase(),
            pathname: '/'
        }
    }

    // URL removes default ports during parsing. Track whether a scheme-less rule
    // explicitly included a port so ":80" is not mistakenly treated as any-port.
    const schemeLessRuleHasExplicitPort = !hasExplicitProtocol && hasExplicitPort(trimmed)

    let allowed: URL
    try {
        // The injected "http://" scheme is only used to make the URL parser accept
        // scheme-less entries; the parsed protocol is not used for matching in that case.
        allowed = new URL(hasExplicitProtocol ? trimmed : `http://${trimmed}`)
    } catch {
        return null
    }

    if (allowed.protocol !== 'http:' && allowed.protocol !== 'https:') return null

    // Credentials, queries, and fragments are not valid destination authorization rules.
    if (allowed.username || allowed.password) return null
    if (allowed.search || allowed.hash) return null

    let port: string | undefined
    if (hasExplicitProtocol) {
        // Explicit protocol with no port restricts the rule to that protocol's default port.
        const effectivePort = getEffectiveHttpPort(allowed)
        if (!effectivePort) return null
        port = effectivePort
    } else if (schemeLessRuleHasExplicitPort) {
        // Injected parsing protocol is HTTP, so an explicitly provided port that
        // URL normalized away must have been 80.
        port = allowed.port || '80'
    }

    return {
        protocol: hasExplicitProtocol ? (allowed.protocol as 'http:' | 'https:') : undefined,
        hostname: normalizeHostname(allowed.hostname),
        port,
        pathname: normalizePathname(allowed.pathname)
    }
}

/**
 * Checks whether `target` is authorized by any entry in the HTTP allow list.
 * Non-http/https targets are never authorized here.
 */
export function isHttpAllowListed(target: URL, allowList: string[]): boolean {
    const targetPort = getEffectiveHttpPort(target)
    if (!targetPort) return false

    const targetHostname = normalizeHostname(target.hostname)

    return allowList.some((entry) => {
        const allowed = parseHttpAllowRule(entry)
        if (!allowed) return false
        if (allowed.hostname !== targetHostname) return false

        // Enforce protocol only when the rule explicitly included it.
        if (allowed.protocol && allowed.protocol !== target.protocol) return false

        // A rule without a port allows any HTTP or HTTPS port.
        if (allowed.port && allowed.port !== targetPort) return false

        return isPathAllowed(target.pathname, allowed.pathname)
    })
}

/**
 * Reads the raw HTTP_ALLOW_LIST env variable and returns the trimmed, non-empty
 * entries. Parsing and matching happen in `isHttpAllowListed` / `parseHttpAllowRule`.
 */
function getHttpAllowList(): string[] {
    const raw = process.env.HTTP_ALLOW_LIST
    if (!raw) return []
    return raw
        .split(',')
        .map((s) => s.trim())
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
 * URLs matching any HTTP_ALLOW_LIST entry bypass the deny list entirely, which lets
 * Docker-internal or other trusted private services connect without disabling
 * global SSRF protection via HTTP_SECURITY_CHECK=false. See `parseHttpAllowRule` for
 * supported entry formats (hostname, hostname:port, hostname/path, full URLs, etc).
 * @param url - URL to check
 * @throws Error if URL hostname resolves to a denied IP
 */
export async function checkDenyList(url: string): Promise<void> {
    const httpDenyList = getHttpDenyList()
    const httpAllowList = getHttpAllowList()

    const urlObj = new URL(url)

    // Explicitly allowed URLs bypass the deny list.
    if (isHttpAllowListed(urlObj, httpAllowList)) return

    let hostname = urlObj.hostname
    // Strip IPv6 brackets if present
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
        hostname = hostname.slice(1, -1)
    }

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

    // Explicitly allowed URLs bypass the deny list.
    const isAllowed = isHttpAllowListed(u, allowList)

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
