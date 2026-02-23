/**
 * MUI Theme Type Extensions
 *
 * Extends MUI's theme types to include custom properties like 'card' in the palette.
 * This provides TypeScript autocomplete and type safety for custom theme values.
 */

import '@mui/material/styles'

declare module '@mui/material/styles' {
    interface Palette {
        card: {
            main: string
        }
    }

    interface PaletteOptions {
        card?: {
            main: string
        }
    }
}

// Empty export to make this a module
export {}
