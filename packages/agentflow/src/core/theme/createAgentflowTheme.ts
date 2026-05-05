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
            primary: tokens.colors.palette.primary,
            secondary: {
                light: tokens.colors.palette.secondary.light[mode],
                main: tokens.colors.palette.secondary.main[mode],
                dark: tokens.colors.palette.secondary.dark[mode]
            },
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
            },
            // Custom card color (now type-safe thanks to types.ts)
            card: {
                main: tokens.colors.background.card[mode]
            },
            warningBanner: {
                background: tokens.colors.semantic.warningBg,
                text: tokens.colors.semantic.warningText
            }
        },
        typography: {
            h4: { fontSize: tokens.typography.fontSize.lg, fontWeight: tokens.typography.fontWeight.semibold },
            h5: { fontSize: tokens.typography.fontSize.md, fontWeight: tokens.typography.fontWeight.medium },
            h6: { fontSize: tokens.typography.fontSize.sm, fontWeight: tokens.typography.fontWeight.medium },
            subtitle1: { fontSize: tokens.typography.fontSize.md, fontWeight: tokens.typography.fontWeight.medium },
            body1: { fontSize: tokens.typography.fontSize.md, fontWeight: tokens.typography.fontWeight.regular },
            body2: { fontSize: tokens.typography.fontSize.sm, fontWeight: tokens.typography.fontWeight.regular }
        },
        components: {
            MuiPaper: {
                defaultProps: {
                    elevation: 0
                },
                styleOverrides: {
                    root: {
                        backgroundImage: 'none'
                    }
                }
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        backgroundColor: tokens.colors.background.input[mode],
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: tokens.colors.border.input[mode]
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: tokens.colors.border.hover[mode]
                        }
                    },
                    input: {
                        fontWeight: tokens.typography.fontWeight.medium
                    }
                }
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        '&.Mui-selected': {
                            color: tokens.colors.palette.secondary.dark[mode],
                            backgroundColor: tokens.colors.background.listItemSelected[mode] || tokens.colors.palette.secondary.light[mode],
                            '&:hover': {
                                backgroundColor:
                                    tokens.colors.background.listItemSelected[mode] || tokens.colors.palette.secondary.light[mode]
                            }
                        },
                        '&:hover': {
                            color: tokens.colors.palette.secondary.dark[mode],
                            backgroundColor: tokens.colors.background.listItemSelected[mode] || tokens.colors.palette.secondary.light[mode]
                        }
                    }
                }
            },
            MuiAutocomplete: {
                styleOverrides: {
                    paper: {
                        boxShadow:
                            '0px 8px 10px -5px rgb(0 0 0 / 20%), 0px 16px 24px 2px rgb(0 0 0 / 14%), 0px 6px 30px 5px rgb(0 0 0 / 12%)',
                        borderRadius: '10px'
                    },
                    option: {
                        '&:hover': {
                            background: isDarkMode ? `${tokens.colors.background.optionHover.dark} !important` : undefined
                        }
                    }
                }
            }
        },
        spacing: 8, // MUI's default base unit
        shape: {
            borderRadius: tokens.borderRadius.md
        }
    })
}
