import colorUtil from './colorUtils'

function generateThemeColors(baseColor) {
    const base = colorUtil(baseColor)

    const getContrastingColor = (color) => {
        return colorUtil(color).isLight() ? colorUtil('black').toHexString() : colorUtil('white').toHexString()
    }

    return {
        buttonBackgroundColor: colorUtil(baseColor).setAlpha(1).toRgbString(), // Changed to 50% opacity
        buttonIconColor: getContrastingColor(base),
        chatWindowBackgroundColor: colorUtil(baseColor).lighten(20).toHexString(),
        chatWindowPoweredByTextColor: getContrastingColor(colorUtil(baseColor).lighten(20)),
        botMessageBackgroundColor: colorUtil(baseColor).lighten(50).toHexString(),
        botMessageTextColor: getContrastingColor(colorUtil(baseColor).lighten(50)),
        userMessageBackgroundColor: colorUtil(baseColor).lighten(10).toHexString(),
        userMessageTextColor: getContrastingColor(colorUtil(baseColor).lighten(10)),
        textInputSendButtonColor: colorUtil(baseColor).toHexString(),
        feedbackColor: colorUtil(baseColor).toHexString(),
        textInputBackgroundColor: '#ffffff',
        textInputTextColor: '#000000',
        footerTextColor: getContrastingColor(colorUtil(baseColor))
    }
}

export default generateThemeColors
