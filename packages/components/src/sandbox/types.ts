/**
 * Sandbox — core protocol types.
 *
 * These interfaces are the contract every sandbox backend implements.
 * They follow `docs/BASH_EXECUTION_ARCHITECTURE.md` Sections 3.1–3.7
 * verbatim so adopters can swap a backend without touching the agent
 * loop or the model's tools.
 *
 * Key design choices:
 *   - All filesystem operations return tagged-union results with an
 *     explicit `error?` field — errors are *returned*, not thrown, so
 *     the middleware layer can surface them as ordinary tool messages.
 *   - Capability detection is structural (`isSandboxBackend`), not
 *     `instanceof`, so backends from adapters, composites, or proxies
 *     all work uniformly.
 *   - The `SandboxRuntime` lifecycle is independent of the backend
 *     protocol so ephemeral / one-shot backends can omit it.
 */

// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

export type MaybePromise<T> = T | Promise<T>

/** Errors are returned as `error?: string`, not thrown, on every filesystem op. */
export interface ResultBase {
    error?: string
}

// ---------------------------------------------------------------------------
// ExecuteResponse
// ---------------------------------------------------------------------------

/**
 * The shape of every command result.
 *
 *   1. `output` is a single combined stream. Backends may annotate
 *      stderr lines for visual distinction, but the type itself is one
 *      string — keeps prompts simple.
 *   2. `exitCode` is the source of truth for success/failure. Callers
 *      MUST NOT infer failure from the contents of `output`.
 *   3. `truncated` is mandatory. Even when the runtime never truncates,
 *      it must report `false`.
 */
export interface ExecuteResponse {
    /** Combined stdout and stderr output, in the order they were produced. */
    output: string
    /**
     * Process exit code, or `null` if the runtime did not report one
     * (e.g. the process was killed before it terminated naturally).
     */
    exitCode: number | null
    /**
     * True when the runtime capped output before returning it.
     * Implementations must honestly report truncation so callers can react.
     */
    truncated: boolean
}

// ---------------------------------------------------------------------------
// BackendProtocol result shapes
// ---------------------------------------------------------------------------

export interface LsEntry {
    name: string
    path: string
    type: 'file' | 'dir' | 'symlink' | 'unknown'
    size?: number
    /** Unix mtime in seconds. Optional because some hosts lie. */
    mtime?: number
}

export interface LsResult extends ResultBase {
    path: string
    entries: LsEntry[]
}

export interface ReadResult extends ResultBase {
    path: string
    /** The (possibly sliced) text content; null on failure. */
    content: string | null
    /** When `offset`/`limit` were applied, the actual range returned. */
    offset?: number
    limit?: number
    /** Total line count of the file, when known. */
    totalLines?: number
}

export interface ReadRawResult extends ResultBase {
    path: string
    content: Uint8Array | null
}

export interface WriteResult extends ResultBase {
    path: string
    bytesWritten?: number
    /** True iff the file already existed and was overwritten. */
    overwrote?: boolean
}

export interface EditResult extends ResultBase {
    path: string
    /** Number of replacements applied; 0 means `oldString` was not found. */
    replacements: number
}

export interface GlobResult extends ResultBase {
    pattern: string
    /** Search root that was scanned. */
    path: string
    matches: string[]
}

export interface GrepHit {
    path: string
    line: number
    text: string
}

export interface GrepResult extends ResultBase {
    pattern: string
    path: string
    hits: GrepHit[]
}

// ---------------------------------------------------------------------------
// BackendProtocol
// ---------------------------------------------------------------------------

/**
 * The filesystem capabilities every backend implements. The shell layer
 * extends this; it never replaces it.
 */
export interface BackendProtocol {
    ls(path: string): MaybePromise<LsResult>
    read(path: string, offset?: number, limit?: number): MaybePromise<ReadResult>
    readRaw(path: string): MaybePromise<ReadRawResult>
    write(path: string, content: string): MaybePromise<WriteResult>
    edit(path: string, oldString: string, newString: string, replaceAll?: boolean): MaybePromise<EditResult>
    glob(pattern: string, path?: string): MaybePromise<GlobResult>
    grep(pattern: string, path?: string, glob?: string | null): MaybePromise<GrepResult>
}

// ---------------------------------------------------------------------------
// SandboxBackendProtocol
// ---------------------------------------------------------------------------

/**
 * A backend is a "sandbox" iff it provides this interface. The `id`
 * field is used for both structural capability detection
 * (`isSandboxBackend`) and for tracing/isolation (logs, evals,
 * telemetry can associate command executions with a specific sandbox
 * instance).
 */
export interface SandboxBackendProtocol extends BackendProtocol {
    /** Unique identifier for this sandbox instance (non-empty string). */
    readonly id: string

    /** Execute a shell command, returning a typed response. */
    execute(command: string): MaybePromise<ExecuteResponse>
}

// ---------------------------------------------------------------------------
// SandboxRuntime — lifecycle
// ---------------------------------------------------------------------------

/**
 * Long-lived sandboxes typically need to be brought up and torn down.
 * Ephemeral sandboxes (e.g. one-shot subprocess executions) can omit
 * this interface entirely.
 */
export interface SandboxRuntime {
    /** True after initialize() succeeds and before close() is called. */
    readonly isRunning: boolean

    /** Prepare the sandbox for use. Throws if called when already initialized. */
    initialize(): Promise<void>

    /** Release resources. Safe to call multiple times. */
    close(): Promise<void>
}

// ---------------------------------------------------------------------------
// File-transfer primitives
// ---------------------------------------------------------------------------

export type FileOperationError = 'file_not_found' | 'permission_denied' | 'is_directory' | 'invalid_path' | 'io_error'

export interface FileDownloadResponse {
    path: string
    /** Decoded bytes; null on failure. */
    content: Uint8Array | null
    /** Null on success. */
    error: FileOperationError | null
    /** Optional human-readable diagnostic (never machine-parsed). */
    message?: string
}

export interface FileUploadResponse {
    path: string
    error: FileOperationError | null
    message?: string
}

/**
 * Binary-safe writes and reads without going through the shell.
 *
 * Both methods MUST support partial success: the result array always
 * has one entry per input, even if some entries fail. This lets callers
 * batch many transfers in one round-trip and handle per-file outcomes
 * without losing the successful ones.
 */
export interface SandboxFileTransfer {
    uploadFiles(files: Array<[string, Uint8Array]>): MaybePromise<FileUploadResponse[]>
    downloadFiles(paths: string[]): MaybePromise<FileDownloadResponse[]>
}

// ---------------------------------------------------------------------------
// Skill sandbox artifact resolver (UX layer over §3.5)
// ---------------------------------------------------------------------------

/**
 * A single artifact bundled out of a sandbox session.
 *
 * Produced by `SkillSandboxArtifactResolver.resolveArtifact`. The caller
 * (typically the agent's `processSandboxLinks` step) takes the bytes and
 * persists them in chat-scoped storage so the rewritten `sandbox:/...`
 * link in the LLM's response resolves to a downloadable URL.
 */
export interface SkillSandboxArtifact {
    /** Raw bytes from the sandbox. The caller is responsible for storage. */
    bytes: Uint8Array
    /** Basename only — no directory components. The caller still re-sanitises. */
    fileName: string
    /** Best-effort MIME, derived from the extension. */
    mime: string
}

/**
 * Per-execution resolver registered by every active `Skill` node that
 * has a live `SandboxSession`.
 *
 * The agent's `processSandboxLinks` step walks every registered resolver
 * to decide who owns a given `sandbox:/...` URI from the final response.
 *
 * Implementations MUST:
 *   - Reject URIs that point outside their own `outputDir` (return null).
 *     Cross-skill / cross-sandbox reads are an explicit non-feature.
 *   - Reject files larger than the configured per-artifact byte cap
 *     (return null).
 *   - Return null on any backend failure / missing file.
 *   - Never throw — the caller treats null as "next resolver in the list".
 */
export interface SkillSandboxArtifactResolver {
    /** Short, stable identifier for logging / debugging (e.g. the skill slug). */
    readonly id: string

    /**
     * Try to resolve a `sandbox:/<absolute-path>` URI into bytes.
     * Returns null when the URI is out of scope, missing, oversized, or
     * the underlying backend rejected the request.
     */
    resolveArtifact(sandboxUri: string): Promise<SkillSandboxArtifact | null>
}

// ---------------------------------------------------------------------------
// Structured errors
// ---------------------------------------------------------------------------

export type SandboxErrorCode = 'NOT_INITIALIZED' | 'ALREADY_INITIALIZED' | 'COMMAND_TIMEOUT' | 'COMMAND_FAILED' | 'FILE_OPERATION_FAILED'

/**
 * Typed error class with a finite (but open) code set so concrete
 * runtimes can introduce their own codes without breaking the contract.
 */
export class SandboxError extends Error {
    readonly name = 'SandboxError'
    readonly code: SandboxErrorCode | string
    readonly cause?: Error

    constructor(message: string, code: SandboxErrorCode | string, cause?: Error) {
        super(message)
        this.code = code
        if (cause) this.cause = cause
    }
}
