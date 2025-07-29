import { z } from 'zod'

export const MCP_STREAMING_CONFIG = {
    DEFAULT_COMPLETION_TIMEOUT: 600000, // 10 minutes fallback - only as safety net
    NOTIFICATION_DELAY: 1000, // 1 second delay before cleanup
    SUPPORTED_NOTIFICATION_TYPES: ['logging/message', 'progress'],
    STREAMING_MARKER: '[MCP Streaming]'
}