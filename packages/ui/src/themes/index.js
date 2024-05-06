import { createTheme } from '@mui/material/styles'

// assets
import colors from '@/assets/scss/_themes-vars.module.scss'
import colorsStartAI from '@/assets/scss/_themes-vars-StartAI.module.scss'

// project imports
import componentStyleOverrides from './compStyleOverride'
import themePalette from './palette'
import themeTypography from './typography'

/**
 * Represent theme style and structure as per Material-UI
 * @param {JsonObject} customization customization parameter object
 */

export const theme = (customization) => {
    let color

    switch (window.location.hostname) {
        case 'app.start-ai.ru':
            color = colorsStartAI
            break
        case 'u1.start-ai.ru':
            color = colorsStartAI
            break
        case 'u2.start-ai.ru':
            color = colorsStartAI
            break
        case 'u3.start-ai.ru':
            color = colorsStartAI
            break
        case 'u4.start-ai.ru':
            color = colorsStartAI
            break
        case 'u5.start-ai.ru':
            color = colorsStartAI
            break
        case 'u6.start-ai.ru':
            color = colorsStartAI
            break
        case 'u7.start-ai.ru':
            color = colorsStartAI
            break
        case 'u8.start-ai.ru':
            color = colorsStartAI
            break
        case 'u9.start-ai.ru':
            color = colorsStartAI
            break
        case 'u10.start-ai.ru':
            color = colorsStartAI
            break
        case 'u11.start-ai.ru':
            color = colorsStartAI
            break
        case 'u12.start-ai.ru':
            color = colorsStartAI
            break
        case 'test.start-ai.ru':
            color = colorsStartAI
            break
        case 'dev1.start-ai.ru':
            color = colorsStartAI
            break
        case 'localhost':
            color = colorsStartAI
            break
        default:
            // Действия по умолчанию, если NODE_ENV не соответствует ни одному из условий
            color = colors
            break
    }
    const themeOption = customization.isDarkMode
        ? {
              colors: color,
              heading: color.paper,
              paper: color.darkPrimaryLight,
              backgroundDefault: color.darkPaper,
              background: color.darkPrimaryLight,
              darkTextPrimary: color.paper,
              darkTextSecondary: color.paper,
              textDark: color.paper,
              menuSelected: color.darkSecondaryDark,
              menuSelectedBack: color.darkSecondaryLight,
              divider: color.darkPaper,
              customization
          }
        : {
              colors: color,
              heading: color.grey900,
              paper: color.paper,
              backgroundDefault: color.paper,
              background: color.paper,
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
        palette: themePalette(themeOption),
        mixins: {
            toolbar: {
                minHeight: '48px',
                padding: '16px',
                '@media (min-width: 600px)': {
                    minHeight: '48px'
                }
            }
        },
        typography: themeTypography(themeOption)
    }

    const themes = createTheme(themeOptions)
    themes.components = componentStyleOverrides(themeOption)

    return themes
}

export default theme
