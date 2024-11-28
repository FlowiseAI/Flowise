'use client'
import { PaletteMode } from '@mui/material'
import createTheme from '@mui/material/styles/createTheme'
import { teal, grey, deepOrange } from '@mui/material/colors'
import { theme as studioTheme } from '@/themes'
import { deepmerge } from '@mui/utils'
declare module '@mui/material/Avatar' {
    interface AvatarPropsVariantOverrides {
        source: true
    }
}

const getDesignTokens = (mode: PaletteMode) => ({
    typography: {
        fontFamily: ['var(--font-poppins)']
    },
    shape: {
        borderRadius: 12
    },
    breakpoints: {
        values: {
            xs: 0,
            sm: 600,
            md: 900,
            lg: 1200,
            xl: 1536,
            xxl: 1920
        }
    },
    palette: {
        mode,
        primary: {
            ...teal,
            ...(mode === 'dark' && {
                main: teal[300]
            })
        },
        secondary: {
            ...deepOrange,
            main: deepOrange[200]
        },

        ...(mode === 'dark' && {
            background: {
                default: '#0b0b0b',
                paper: '#161616'
            }
        }),
        text: {
            ...(mode === 'light'
                ? {
                      primary: grey[900],
                      secondary: grey[800]
                  }
                : {
                      primary: '#fff',
                      secondary: grey[500]
                  })
        }
    }
})
declare module '@mui/material/styles' {
    interface BreakpointOverrides {
        xxl: true
    }
}
// @ts-ignore
const theme = createTheme({
    ...getDesignTokens('dark')
})
const studioThemeDark = studioTheme({ isDarkMode: true })

const { background, paper, ...studioPalette } = studioThemeDark.palette
// @ts-ignore
export const darkModeTheme = createTheme(
    deepmerge(
        {
            // customization: studioThemeDark.customization,
            // colors:{},
            palette: {
                // ...studioPalette
                asyncSelect: studioPalette.asyncSelect,
                card: studioPalette.card,
                nodeToolTip: studioPalette.nodeToolTip
            }
        },
        {
            ...getDesignTokens('dark'),
            components: {
                MuiTypography: {
                    styleOverrides: {
                        root: {
                            'ul, ol': {
                                paddingLeft: theme.spacing(3)
                            }
                        }
                    }
                },
                MuiDrawer: {
                    styleOverrides: {
                        paper: {
                            border: 'none'
                        }
                    }
                },
                MuiBackdrop: {
                    styleOverrides: {
                        root: {
                            background: 'rgba(0, 0, 0, 0.75)'
                        }
                    }
                },
                MuiButton: {
                    defaultProps: {},
                    styleOverrides: {
                        root: {
                            // borderRadius: theme.spacing(0),
                            padding: theme.spacing(0.5, 1)
                        }
                    }
                },

                MuiContainer: {
                    defaultProps: { maxWidth: 'xxl' }
                },
                MuiList: {
                    styleOverrides: {
                        root: {
                            display: 'flex',
                            flexDirection: 'column',
                            padding: theme.spacing(1),
                            gap: theme.spacing(1)
                        }
                    }
                },
                MuiListSubheader: {
                    styleOverrides: {
                        root: {
                            backgroundColor: 'transparent',
                            paddingLeft: theme.spacing(0)
                        }
                    }
                },
                MuiListItemButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: 8,
                            padding: theme.spacing(0.5, 1)
                        }
                    }
                },
                MuiListItemIcon: {
                    styleOverrides: {
                        root: {}
                    }
                },
                MuiListItemText: {
                    styleOverrides: {
                        primary: {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        },
                        secondary: {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }
                    }
                },
                MuiTextField: {
                    defaultProps: { size: 'small' }
                },
                MuiAvatar: {
                    variants: [
                        {
                            props: { variant: 'source' },
                            style: { backgroundColor: 'white', img: { padding: 4, objectFit: 'contain' } }
                        }
                    ]
                },
                MuiAccordion: {
                    styleOverrides: {
                        root: {
                            width: '100%',
                            overflow: 'hidden',
                            margin: 0,
                            background: 'none',
                            boxShadow: 'none',
                            '.MuiAccordionSummary-root': {
                                minHeight: 0,
                                '&.Mui-expanded': { minHeight: 1 },
                                gap: 2
                            },
                            '&.Mui-expanded': { margin: 0 },
                            '.MuiAccordionSummary-content': {
                                margin: 0,
                                '&.Mui-expanded': { margin: 0 }
                            },
                            '.MuiAccordionDetails-root': { padding: 0 }
                        }
                    }
                }
            }
        }
    )
)
