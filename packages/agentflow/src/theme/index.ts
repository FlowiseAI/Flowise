import { createTheme, ThemeOptions } from '@mui/material/styles'

export const createAgentflowTheme = (isDarkMode: boolean = false) => {
    const themeOptions: ThemeOptions = {
        palette: {
            mode: isDarkMode ? 'dark' : 'light',
            primary: {
                main: '#2196F3',
                light: '#64B5F6',
                dark: '#1976D2'
            },
            secondary: {
                main: '#9C27B0',
                light: '#BA68C8',
                dark: '#7B1FA2'
            },
            error: {
                main: '#F44336'
            },
            warning: {
                main: '#FF9800'
            },
            success: {
                main: '#4CAF50'
            },
            background: {
                default: isDarkMode ? '#1a1a1a' : '#f5f5f5',
                paper: isDarkMode ? '#2d2d2d' : '#ffffff'
            },
            ...(isDarkMode
                ? {
                      card: {
                          main: '#2d2d2d'
                      }
                  }
                : {
                      card: {
                          main: '#ffffff'
                      }
                  })
        },
        typography: {
            fontFamily: "'Roboto', sans-serif"
        },
        shape: {
            borderRadius: 12
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none'
                    }
                }
            }
        }
    }

    return createTheme(themeOptions)
}

// Extend the theme type to include custom properties
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
    interface Theme {
        darkTextPrimary: string
        darkTextSecondary: string
    }
    interface ThemeOptions {
        darkTextPrimary?: string
        darkTextSecondary?: string
    }
}
