/**
 * Parses a host string (e.g. "localhost:8080") into host and port.
 * Used when migrating from weaviate-ts-client v2 to weaviate-client v3.
 */
export function parseHostPort(host: string): { host: string; port: number } {
    const parts = host.split(':')
    if (parts.length >= 2) {
        const port = parseInt(parts[parts.length - 1], 10)
        if (!isNaN(port)) {
            return { host: parts.slice(0, -1).join(':'), port }
        }
    }
    return { host, port: 8080 }
}
