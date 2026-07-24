/**
 * SSL configuration resolution for the Postgres vector store connection.
 *
 * Kept as a dependency-free leaf module (no barrel import) so it can be unit
 * tested in isolation, mirroring `src/sanitizeDataSourceOptions.ts`.
 */

/**
 * Resolves the SSL option used to open the Postgres connection.
 *
 * The node exposes a boolean "SSL" toggle, but the "Additional Configuration"
 * field also documents `ssl` as a supported TypeORM connection option. When an
 * operator needs a custom CA (AWS RDS, an internal corporate CA) or has to relax
 * verification for a self-signed certificate, they supply a richer value there,
 * e.g. `{ "ssl": { "ca": "<pem>" } }` or `{ "ssl": { "rejectUnauthorized": false } }`.
 * That value must take precedence over the boolean toggle instead of being
 * clobbered by it, otherwise operators are pushed onto the global
 * `NODE_TLS_REJECT_UNAUTHORIZED=0` escape hatch, which disables TLS verification
 * process-wide. Falls back to the boolean toggle when Additional Configuration
 * does not specify `ssl`, preserving the existing default behaviour.
 */
export function resolvePostgresSSL(additionalConfig: Record<string, any> | undefined, sslToggle: boolean): boolean | Record<string, any> {
    if (additionalConfig != null && Object.prototype.hasOwnProperty.call(additionalConfig, 'ssl')) {
        return additionalConfig.ssl
    }
    return sslToggle
}
