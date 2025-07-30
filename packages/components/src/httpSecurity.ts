import * as ipaddr from 'ipaddr.js'
import dns from 'dns/promises'

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
