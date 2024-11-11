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
    // typography: {
    //     fontFamily: ['var(--font-poppins)']
    // },
    // shape: {
    //     borderRadius: 12
    // },
    // breakpoints: {
    //     values: {
    //         xs: 0,
    //         sm: 600,
    //         md: 900,
    //         lg: 1200,
    //         xl: 1536,
    //         xxl: 1920
    //     }
    // },
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

const baseTheme = createTheme({
    ...getDesignTokens('dark')
})

const studioThemeDark = studioTheme({ isDarkMode: true })
const { background, ...studioPalette } = studioThemeDark.palette
export const darkModeTheme = createTheme(
    deepmerge(
        baseTheme,
        // studioTheme({ isDarkMode: true }),
        {
            // ...studioThemeDark,
            palette: {
                ...studioPalette
            }
        },
        {
            components: {
                MuiTypography: {
                    styleOverrides: {
                        root: {
                            'ul, ol': {
                                paddingLeft: baseTheme.spacing(3)
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
                            padding: baseTheme.spacing(0.5, 1)
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
                            padding: baseTheme.spacing(1),
                            gap: baseTheme.spacing(1)
                        }
                    }
                },
                MuiListSubheader: {
                    styleOverrides: {
                        root: {
                            backgroundColor: 'transparent',
                            paddingLeft: baseTheme.spacing(0)
                        }
                    }
                },
                MuiListItemButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: 8,
                            padding: baseTheme.spacing(0.5, 1)
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
                // MuiTextField: {
                //     // defaultProps: { size: 'small' }
                // },
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
