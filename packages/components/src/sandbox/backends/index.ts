/**
 * Sandbox — shipped backend adapters.
 *
 * Add a new backend by dropping a file in this directory that extends
 * `BaseSandbox`, implements `SandboxRuntime` if it needs a lifecycle,
 * and re-exporting it here.
 *
 * Shipped backends:
 *   - `E2BBackend`     — production / managed.
 *   - `DockerBackend`  — local-dev & self-host; runs every command in a
 *                        sealed container so the host filesystem is
 *                        never modified by an LLM-issued command.
 */

export * from './E2BBackend'
export * from './DockerBackend'
