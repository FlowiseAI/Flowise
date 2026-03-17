/**
 * Parses a host string into host and optional port.
 * Handles IPv6 bracket notation (e.g. "[::1]:8080") and plain "host:port".
 */
export function parseHostPort(host: string): { host: string; port?: number } {
    const ipv6Match = host.match(/^\[([^\]]+)\](?::(\d+))?$/)
    if (ipv6Match) {
        const port = ipv6Match[2] ? parseInt(ipv6Match[2], 10) : undefined
        return { host: ipv6Match[1], port: isNaN(port as number) ? undefined : port }
    }
    const lastColon = host.lastIndexOf(':')
    if (lastColon > 0) {
        const maybePart = host.substring(lastColon + 1)
        const port = parseInt(maybePart, 10)
        if (!isNaN(port) && String(port) === maybePart) {
            return { host: host.substring(0, lastColon), port }
        }
    }
    return { host }
}
