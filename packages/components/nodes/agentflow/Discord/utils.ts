export function getErrorMessage(err: any): string {
    if (!err.response) {
        return `Network error when contacting Discord: ${err.message}`
    }

    const status = err.response?.status
    const detail = err.response?.data ?? err.message

    // Handle specific Discord API errors
    if (status === 403) {
        return 'Bot lacks permission to send messages in this channel'
    } else if (status === 404) {
        return 'Channel not found or bot cannot access it'
    } else if (status === 401) {
        return 'Invalid bot token'
    } else if (status === 429) {
        const retryAfter = err.response?.headers['retry-after']
        return `Discord API rate limited. Retry after ${retryAfter} seconds`
    } else if (status === 400) {
        return `Invalid message data: ${JSON.stringify(detail)}`
    }

    return `Discord API Error (${status}): ${JSON.stringify(detail)}`
}

// Validates a Discord snowflake ID (17-19 digit number)
export function validSnowflakeId(snowflake: string): boolean {
    return /^\d{17,19}$/.test(snowflake)
}
