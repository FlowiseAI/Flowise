import client from './client'
import { baseURL } from '@/store/constant'

// API client for Skills V2
// packages/server/src/routes/skills/index.ts.

const listSkills = (params) => client.get('/skills', { params })

const getSkill = (skillId) => client.get(`${'/skills'}/${skillId}`)

const createSkill = (body) => client.post('/skills', body)

const updateSkill = (skillId, body) => client.put(`${'/skills'}/${skillId}`, body)

const deleteSkill = (skillId) => client.delete(`${'/skills'}/${skillId}`)

const publishSkill = (skillId) => client.post(`${'/skills'}/${skillId}/publish`)

const getBundle = (skillId, mode) => client.get(`${'/skills'}/${skillId}/bundle`, { params: mode ? { mode } : undefined })

const validateSkill = (skillId) => client.post(`${'/skills'}/${skillId}/validate`)

const getSkillDependencies = (skillId, nodeId) =>
    client.get(`${'/skills'}/${skillId}/dependencies`, { params: nodeId ? { nodeId } : undefined })

const getSkillGraph = (skillId, mode) => client.get(`${'/skills'}/${skillId}/graph`, { params: mode ? { mode } : undefined })

// -------- node-level --------

const createNode = (skillId, body) => client.post(`${'/skills'}/${skillId}/nodes`, body)

const getNode = (skillId, nodeId) => client.get(`${'/skills'}/${skillId}/nodes/${nodeId}`)

const updateNode = (skillId, nodeId, body) => client.put(`${'/skills'}/${skillId}/nodes/${nodeId}`, body)

const deleteNode = (skillId, nodeId, recursive) =>
    client.delete(`${'/skills'}/${skillId}/nodes/${nodeId}`, {
        params: recursive ? { recursive: 'true' } : undefined
    })

const uploadNodeBinary = (skillId, nodeId, formData) =>
    client.post(`${'/skills'}/${skillId}/nodes/${nodeId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })

// Returns a fully-qualified URL suitable for <img> / <video> / <a href>.
// Uses the axios instance's baseURL + /api/v1 prefix.
//
// NOTE: The download route is protected by the same middleware that gates every
// other `/api/v1/*` endpoint. A plain browser request (e.g. `<img src=...>` or
// `<a href=...>`) won't carry the `x-request-from: internal` header that the
// server uses to pick the cookie/session auth branch, so it ends up on the
// API-key path and returns 401. Prefer `downloadNodeBinary` for inline preview
// + download; this URL helper is kept for callers that already know they're
// hitting a whitelisted or externally-authenticated flow.
const downloadNodeBinaryUrl = (skillId, nodeId) => `${baseURL}/api/v1/skills/${skillId}/nodes/${nodeId}/download`

// Authenticated fetch of the raw bytes for a node. Returns an axios response
// whose `data` is a Blob. Callers can pipe this into `URL.createObjectURL` for
// inline previews or trigger a download link.
const downloadNodeBinary = (skillId, nodeId, opts) =>
    client.get(`${'/skills'}/${skillId}/nodes/${nodeId}/download`, { responseType: 'blob', ...opts })

const getNodeDependencies = (skillId, nodeId) => client.get(`${'/skills'}/${skillId}/nodes/${nodeId}/dependencies`)

export default {
    listSkills,
    getSkill,
    createSkill,
    updateSkill,
    deleteSkill,
    publishSkill,
    getBundle,
    validateSkill,
    getSkillDependencies,
    getSkillGraph,
    createNode,
    getNode,
    updateNode,
    deleteNode,
    uploadNodeBinary,
    downloadNodeBinaryUrl,
    downloadNodeBinary,
    getNodeDependencies
}
