/**
 * Sandbox — tar reader for Docker `getArchive`.
 *
 * `container.getArchive({ path })` returns a tar stream whose top-level
 * entry is the basename of the requested path. We extract that single
 * file's bytes into a `Buffer`. Directory listings are not used — every
 * download is a one-path-one-buffer round trip, matching the
 * `SandboxFileTransfer.downloadFiles` contract.
 */

import * as tar from 'tar-stream'
import { Readable } from 'node:stream'

export interface TarReadResult {
    /** Logical path that was requested. */
    path: string
    /** Bytes of the first regular file in the tar; null when none was found. */
    bytes: Uint8Array | null
    /** True iff the tar held a directory entry instead of a regular file. */
    isDirectory: boolean
}

/**
 * Extract the first regular file from a tar stream. dockerode's
 * `getArchive` always returns a tar even when reading a single file;
 * the tar entry's `name` is the basename of the requested path.
 */
export const readFirstFile = async (stream: NodeJS.ReadableStream, logicalPath: string): Promise<TarReadResult> => {
    const extract = tar.extract()
    return new Promise<TarReadResult>((resolve, reject) => {
        let resolved = false
        let isDirectory = false
        const chunks: Buffer[] = []

        extract.on('entry', (header, entryStream, next) => {
            if (resolved) {
                entryStream.resume()
                next()
                return
            }
            if (header.type === 'directory') {
                isDirectory = true
                entryStream.resume()
                next()
                return
            }
            if (header.type !== 'file' && header.type !== 'contiguous-file') {
                // symlinks, block devices, etc. — skip, look for a real file.
                entryStream.resume()
                next()
                return
            }
            entryStream.on('data', (c: Buffer) => chunks.push(c))
            entryStream.on('end', () => {
                resolved = true
                resolve({
                    path: logicalPath,
                    bytes: new Uint8Array(Buffer.concat(chunks)),
                    isDirectory: false
                })
                next()
            })
            entryStream.on('error', reject)
        })

        extract.on('finish', () => {
            if (resolved) return
            resolve({ path: logicalPath, bytes: null, isDirectory })
        })
        extract.on('error', reject)

        // Pipe the daemon's tar stream into the extractor.
        const readable = stream as Readable
        readable.on('error', reject)
        readable.pipe(extract)
    })
}
