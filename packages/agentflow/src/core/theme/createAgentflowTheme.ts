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
        typography: {
            h4: { fontSize: '1rem', fontWeight: 600 },
            h5: { fontSize: '0.875rem', fontWeight: 600 },
            h6: { fontSize: '0.75rem', fontWeight: 500 },
            subtitle1: { fontSize: '0.875rem', fontWeight: 500 },
            body1: { fontSize: '0.875rem', fontWeight: 400 },
            body2: { fontSize: '0.75rem', fontWeight: 400 }
        },
        spacing: 8, // MUI's default base unit
        shape: {
            borderRadius: tokens.borderRadius.md
        }
    })
}
