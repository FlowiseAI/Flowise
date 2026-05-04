import { deleteBlobFolderFromStorage, deleteBlobFromStorage, readBlobFromStorage, writeBlobToStorage } from 'flowise-components'
import { PublishedPointer, SkillBundle, SkillNodeMeta, SkillNodePayload } from './entities'
import { guessMime } from './utils/tree'
import { sha256 } from './utils/digest'

/**
 * SkillStorage — per-skill object-storage wrapper over Flowise's IStorageProvider.
 *
 * Layout (all keys relative to the storage provider's root):
 *
 *   skills/{workspaceId}/{skillId}/
 *     nodes/{nodeId}.json            # md / data / code payloads (content + metadata)
 *     nodes/{nodeId}.bin             # binary payloads
 *     nodes/{nodeId}.meta.json       # sidecar: {digest, size, mime}
 *     artifacts/{bundleId}/bundle.json
 *     artifacts/{bundleId}/resolved/{nodeId}.md
 *     published.json                 # {"currentBundleId": "..."}
 *
 * This module is intentionally thin. It talks directly to the raw blob
 * primitives on `IStorageProvider` (`writeBlob` / `readBlob` / `deleteBlob` /
 * `deleteBlobFolder`) so writes are a single PUT, reads are a single GET, and
 * we never trigger the chatflow-shaped org-wide `getStorageSize` listing on
 * cloud backends. Cloud + HA cost is therefore one storage round-trip per
 * skill mutation, with `Promise.all` used wherever sub-operations are
 * order-independent (e.g. payload + meta sidecar).
 *
 * `readBlobFromStorage` returns `null` on a real "not found" and throws on
 * every other error, so callers can distinguish a genuinely missing payload
 * from a transient cloud outage. The two private helpers preserve the
 * historical surface (`Promise<Buffer | null>`) used by the `get*` exports.
 */

const SKILLS_ROOT = 'skills'
const JSON_MIME = 'application/json'

const prefix = (workspaceId: string, skillId: string): string[] => [SKILLS_ROOT, workspaceId, skillId]

// ---------- low-level helpers ----------

const writeBuffer = async (mime: string, buffer: Buffer, filename: string, ...paths: string[]): Promise<void> => {
    await writeBlobToStorage(buffer, mime, ...paths, filename)
}

const readBuffer = async (filename: string, ...paths: string[]): Promise<Buffer | null> => {
    return readBlobFromStorage(...paths, filename)
}

// ---------- JSON payloads (skill / data / code nodes) ----------

export const putNodeJson = async (
    workspaceId: string,
    skillId: string,
    nodeId: string,
    payload: SkillNodePayload,
    extension: string
): Promise<SkillNodeMeta> => {
    const json = JSON.stringify(payload)
    const buf = Buffer.from(json, 'utf8')
    const mime = guessMime(extension)
    const meta: SkillNodeMeta = { digest: sha256(buf), size: buf.length, mime }
    // Payload and sidecar are independent — write them in parallel. Readers
    // tolerate a missing sidecar (`getNodeMeta` returns `null`) so a partial
    // failure on the sidecar leg never leaves a corrupt node behind.
    await Promise.all([
        writeBuffer(JSON_MIME, buf, `${nodeId}.json`, ...prefix(workspaceId, skillId), 'nodes'),
        putNodeMeta(workspaceId, skillId, nodeId, meta)
    ])
    return meta
}

export const getNodeJson = async (workspaceId: string, skillId: string, nodeId: string): Promise<SkillNodePayload | null> => {
    const buf = await readBuffer(`${nodeId}.json`, ...prefix(workspaceId, skillId), 'nodes')
    if (!buf) return null
    try {
        return JSON.parse(buf.toString('utf8')) as SkillNodePayload
    } catch {
        return null
    }
}

// ---------- Binary payloads ----------

export const putNodeBinary = async (
    workspaceId: string,
    skillId: string,
    nodeId: string,
    buffer: Buffer,
    mime: string
): Promise<SkillNodeMeta> => {
    const meta: SkillNodeMeta = { digest: sha256(buffer), size: buffer.length, mime }
    await Promise.all([
        writeBuffer(mime, buffer, `${nodeId}.bin`, ...prefix(workspaceId, skillId), 'nodes'),
        putNodeMeta(workspaceId, skillId, nodeId, meta)
    ])
    return meta
}

export const getNodeBinary = async (workspaceId: string, skillId: string, nodeId: string): Promise<Buffer | null> => {
    return readBuffer(`${nodeId}.bin`, ...prefix(workspaceId, skillId), 'nodes')
}

// ---------- Per-node meta sidecar ----------

export const putNodeMeta = async (workspaceId: string, skillId: string, nodeId: string, meta: SkillNodeMeta): Promise<void> => {
    const buf = Buffer.from(JSON.stringify(meta), 'utf8')
    await writeBuffer(JSON_MIME, buf, `${nodeId}.meta.json`, ...prefix(workspaceId, skillId), 'nodes')
}

export const getNodeMeta = async (workspaceId: string, skillId: string, nodeId: string): Promise<SkillNodeMeta | null> => {
    const buf = await readBuffer(`${nodeId}.meta.json`, ...prefix(workspaceId, skillId), 'nodes')
    if (!buf) return null
    try {
        return JSON.parse(buf.toString('utf8')) as SkillNodeMeta
    } catch {
        return null
    }
}

// ---------- Node delete ----------

export const deleteNodeAssets = async (workspaceId: string, skillId: string, nodeId: string): Promise<void> => {
    const base = prefix(workspaceId, skillId).concat('nodes')
    // Idempotent — `deleteBlobFromStorage` is a no-op on missing files.
    await Promise.all([`${nodeId}.json`, `${nodeId}.bin`, `${nodeId}.meta.json`].map((fname) => deleteBlobFromStorage(...base, fname)))
}

// ---------- Bundle artifacts ----------

export const putBundle = async (workspaceId: string, skillId: string, bundleId: string, bundle: SkillBundle): Promise<void> => {
    const buf = Buffer.from(JSON.stringify(bundle), 'utf8')
    await writeBuffer(JSON_MIME, buf, `bundle.json`, ...prefix(workspaceId, skillId), 'artifacts', bundleId)
}

export const getBundle = async (workspaceId: string, skillId: string, bundleId: string): Promise<SkillBundle | null> => {
    const buf = await readBuffer(`bundle.json`, ...prefix(workspaceId, skillId), 'artifacts', bundleId)
    if (!buf) return null
    try {
        return JSON.parse(buf.toString('utf8')) as SkillBundle
    } catch {
        return null
    }
}

export const putResolvedMd = async (
    workspaceId: string,
    skillId: string,
    bundleId: string,
    nodeId: string,
    content: string
): Promise<void> => {
    const buf = Buffer.from(content, 'utf8')
    await writeBuffer('text/markdown', buf, `${nodeId}.md`, ...prefix(workspaceId, skillId), 'artifacts', bundleId, 'resolved')
}

// ---------- Published pointer ----------

export const putPublishedPointer = async (workspaceId: string, skillId: string, pointer: PublishedPointer): Promise<void> => {
    const buf = Buffer.from(JSON.stringify(pointer), 'utf8')
    await writeBuffer(JSON_MIME, buf, `published.json`, ...prefix(workspaceId, skillId))
}

export const getPublishedPointer = async (workspaceId: string, skillId: string): Promise<PublishedPointer | null> => {
    const buf = await readBuffer(`published.json`, ...prefix(workspaceId, skillId))
    if (!buf) return null
    try {
        return JSON.parse(buf.toString('utf8')) as PublishedPointer
    } catch {
        return null
    }
}

// ---------- Full-skill cleanup ----------

export const deleteSkillPrefix = async (workspaceId: string, skillId: string): Promise<void> => {
    await deleteBlobFolderFromStorage(...prefix(workspaceId, skillId))
}

/**
 * Remove a single bundle's artifact directory (`artifacts/{bundleId}/`).
 * Used by `publish` to garbage-collect the previously published bundle once a
 * new one has fully committed. The underlying provider call is idempotent.
 */
export const deleteBundleArtifacts = async (workspaceId: string, skillId: string, bundleId: string): Promise<void> => {
    await deleteBlobFolderFromStorage(...prefix(workspaceId, skillId), 'artifacts', bundleId)
}
