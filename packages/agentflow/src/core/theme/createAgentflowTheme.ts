/**
 * MUI Theme Factory for Agentflow
 *
 * Creates a Material-UI theme with custom design tokens.
 * Supports both light and dark modes.
 */

import './types' // Import type extensions

import { createTheme, type Theme } from '@mui/material/styles'

import { tokens } from './tokens'

export function createAgentflowTheme(isDarkMode: boolean): Theme {
    const mode = isDarkMode ? 'dark' : 'light'

    return createTheme({
        palette: {
            mode,
            primary: {
                main: tokens.colors.nodes.agent
            },
            background: {
                default: tokens.colors.background.canvas[mode],
                paper: tokens.colors.background.card[mode]
            },
            divider: tokens.colors.border.default[mode],
            text: {
                primary: tokens.colors.text.primary[mode],
                secondary: tokens.colors.text.secondary[mode]
            },
            // Custom card color (now type-safe thanks to types.ts)
            card: {
                main: tokens.colors.background.card[mode]
            }
        },
        spacing: 8, // MUI's default base unit
        shape: {
            borderRadius: tokens.borderRadius.md
        }
    })
}
