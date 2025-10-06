/**
 * Shared constants for TheAnswer components
 */

/**
 * Supported MIME types for Google Drive file picker
 * Includes Google Workspace files, Microsoft Office formats, PDFs, and text files
 */
export const GOOGLE_DRIVE_SUPPORTED_MIME_TYPES = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
    'application/pdf',
    'text/csv',
    'application/csv',
    'text/comma-separated-values',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-powerpoint',
    'text/plain'
].join(',')

export const ATLASSIAN_MCP_SERVER_URL = 'https://atlassian-remote-mcp.last-rev-llc.workers.dev'
