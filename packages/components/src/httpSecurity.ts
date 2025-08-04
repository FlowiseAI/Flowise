import * as ipaddr from 'ipaddr.js'
import dns from 'dns/promises'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import fetch, { RequestInit, Response } from 'node-fetch'

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
 * Checks if a URL is allowed based on HTTP_DENY_LIST environment variable
 * @param url - URL to check
 * @throws Error if URL hostname resolves to a denied IP
 */
export async function checkDenyList(url: string): Promise<void> {
    const httpDenyListString: string | undefined = process.env.HTTP_DENY_LIST
    if (!httpDenyListString) return

    const httpDenyList = httpDenyListString.split(',').map((ip) => ip.trim())
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
    let redirectCount = 0
    let currentConfig = { ...config, maxRedirects: 0 } // Disable automatic redirects

    // Validate the initial URL
    if (currentUrl) {
        await checkDenyList(currentUrl)
    }

    while (redirectCount <= maxRedirects) {
        try {
            // Update the URL in config for subsequent requests
            currentConfig.url = currentUrl

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

            redirectCount++

            if (redirectCount > maxRedirects) {
                throw new Error('Too many redirects')
            }

            // Resolve the redirect URL (handle relative URLs)
            const redirectUrl = new URL(location, currentUrl).toString()

            // Validate the redirect URL against the deny list
            await checkDenyList(redirectUrl)

            // Update current URL for next iteration
            currentUrl = redirectUrl

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
        } catch (error) {
            // If it's not a redirect-related error from axios, propagate it
            if (error.response && error.response.status >= 300 && error.response.status < 400) {
                // This is a redirect response that axios couldn't handle automatically
                // Continue with our manual redirect handling
                const response = error.response
                const location = response.headers.location

                if (!location) {
                    return response
                }

                redirectCount++

                if (redirectCount > maxRedirects) {
                    throw new Error('Too many redirects')
                }

                const redirectUrl = new URL(location, currentUrl).toString()
                await checkDenyList(redirectUrl)
                currentUrl = redirectUrl

                // Handle method changes for redirects
                if (response.status === 301 || response.status === 302 || response.status === 303) {
                    if (
                        response.status === 303 ||
                        (currentConfig.method && ['POST', 'PUT', 'PATCH'].includes(currentConfig.method.toUpperCase()))
                    ) {
                        currentConfig.method = 'GET'
                        delete currentConfig.data
                    }
                }
                continue
            }

            // For other errors, re-throw
            throw error
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

    // Validate the initial URL
    await checkDenyList(currentUrl)

    while (redirectCount <= maxRedirects) {
        const response = await fetch(currentUrl, currentInit)

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
        const redirectUrl = new URL(location, currentUrl).toString()

        // Validate the redirect URL against the deny list
        await checkDenyList(redirectUrl)

        // Update current URL for next iteration
        currentUrl = redirectUrl

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
