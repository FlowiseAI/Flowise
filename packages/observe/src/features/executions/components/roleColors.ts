import { darken, type Theme } from '@mui/material/styles'

export interface RoleColors {
    bg: string
    color: string
    border: string
}

/**
 * Maps a chat message role (assistant, user, system, tool, ...) to a chip
 * color triple. Mirrors the legacy `getRoleColors` helper in
 * NodeExecutionDetails.jsx.
 */
export function getRoleColors(role: string, theme: Theme, isDarkMode: boolean): RoleColors {
    switch (role) {
        case 'assistant':
        case 'ai':
            return {
                bg: isDarkMode ? darken(theme.palette.success.dark, 0.5) : theme.palette.success.light,
                color: isDarkMode ? theme.palette.common.white : theme.palette.success.dark,
                border: theme.palette.success.main
            }
        case 'system':
            return {
                bg: isDarkMode ? darken(theme.palette.warning.dark, 0.5) : theme.palette.warning.light,
                color: isDarkMode ? theme.palette.common.white : theme.palette.warning.dark,
                border: theme.palette.warning.main
            }
        case 'developer':
            return {
                bg: isDarkMode ? darken(theme.palette.info.dark, 0.5) : theme.palette.info.light,
                color: isDarkMode ? theme.palette.common.white : theme.palette.info.dark,
                border: theme.palette.info.main
            }
        case 'user':
        case 'human':
            return {
                bg: isDarkMode ? darken(theme.palette.primary.main, 0.5) : theme.palette.primary.light,
                color: isDarkMode ? theme.palette.common.white : theme.palette.primary.dark,
                border: theme.palette.primary.main
            }
        case 'tool':
        case 'function':
            return {
                bg: isDarkMode ? darken(theme.palette.secondary.main, 0.5) : theme.palette.secondary.light,
                color: isDarkMode ? theme.palette.common.white : theme.palette.secondary.dark,
                border: theme.palette.secondary.main
            }
        default:
            return {
                bg: isDarkMode ? darken(theme.palette.grey[700], 0.5) : theme.palette.grey[300],
                color: isDarkMode ? theme.palette.common.white : theme.palette.grey[800],
                border: isDarkMode ? theme.palette.grey[600] : theme.palette.grey[500]
            }
    }
}
