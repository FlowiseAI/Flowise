import { createTheme } from '@mui/material/styles'

// assets
import colors from '@/assets/scss/_themes-vars.module.scss'

// project imports
import componentStyleOverrides from './compStyleOverride'
import themePalette from './palette'
import themeTypography from './typography'

export const theme = (customization) => {
  const color = colors

  const themeOption = customization.isDarkMode
    ? {
        // ==== DARK (updated) ====
        colors: color,
        backgroundDefault: '#0f1115', // page
        paper: '#171a1f',             // cards/panels
        background: '#171a1f',        // used by typography.mainContent
        heading: '#e8eaed',
        darkTextPrimary: '#ffffff',
        darkTextSecondary: '#c8cbd0',
        textDark: '#e8eaed',
        divider: 'transparent',       // remove hairlines in dark
        // keep legacy tokens as-is
        menuSelected: color.darkSecondaryDark,
        menuSelectedBack: color.darkSecondaryLight,
        customization
      }
    : {
        // ==== LIGHT (restored exactly to original) ====
        colors: color,
        heading: color.grey900,
        paper: color.paper,
        backgroundDefault: color.paper,
        background: color.primaryLight,
        darkTextPrimary: color.grey700,
        darkTextSecondary: color.grey500,
        textDark: color.grey900,
        menuSelected: color.secondaryDark,
        menuSelectedBack: color.secondaryLight,
        divider: color.grey200,
        customization
      }

  const themeOptions = {
    direction: 'ltr',
    palette: themePalette(themeOption),          // maps paper/default into MUI palette :contentReference[oaicite:1]{index=1}
    mixins: {
      toolbar: {
        minHeight: '48px',
        padding: '16px',
        '@media (min-width: 600px)': { minHeight: '48px' }
      }
    },
    typography: themeTypography(themeOption)     // uses themeOption.background for mainContent :contentReference[oaicite:2]{index=2}
  }

  const themes = createTheme(themeOptions)

  // Merge component overrides; no CssBaseline changes (prevents light-mode shifts)
  themes.components = componentStyleOverrides(themeOption)

  return themes
}

export default theme
