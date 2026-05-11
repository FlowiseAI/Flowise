import { createTheme, type Theme } from '@mui/material/styles'

import { tokens } from './tokens'

export function createObserveTheme(isDarkMode: boolean): Theme {
    const mode = isDarkMode ? 'dark' : 'light'

    return createTheme({
        palette: {
            mode,
            primary: tokens.colors.palette.primary,
            secondary: tokens.colors.palette.secondary,
            success: tokens.colors.palette.success,
            error: tokens.colors.palette.error,
            warning: tokens.colors.palette.warning,
            background: {
                default: tokens.colors.background.canvas[mode],
                paper: tokens.colors.background.card[mode]
            },
            divider: tokens.colors.border.default[mode],
            text: {
                primary: tokens.colors.text.primary[mode],
                secondary: tokens.colors.text.secondary[mode]
            }
        },
        typography: {
            fontFamily: `'Inter', 'Roboto', 'Arial', sans-serif`,
            // Match legacy Berry theme weights so section headers (h5) read as
            // medium-weight subheadings rather than aggressive 600-weight bold.
            h4: { fontSize: '1rem', fontWeight: 600 },
            h5: { fontSize: '0.875rem', fontWeight: 500 },
            h6: { fontSize: '0.75rem', fontWeight: 500 },
            subtitle1: { fontSize: '0.875rem', fontWeight: 500 },
            body1: { fontSize: '0.875rem', fontWeight: 400 },
            body2: { fontSize: '0.75rem', fontWeight: 400 }
        },
        components: {
            MuiPaper: {
                defaultProps: { elevation: 0 },
                styleOverrides: { root: { backgroundImage: 'none' } }
            }
        },
        spacing: 8,
        shape: { borderRadius: tokens.borderRadius.md }
    })
}
