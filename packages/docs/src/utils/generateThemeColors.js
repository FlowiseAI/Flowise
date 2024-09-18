import tinycolor from 'tinycolor2'

function generateThemeColors(baseColor) {
    const base = tinycolor(baseColor)

    const getContrastingColor = (color) => {
        return tinycolor(color).isLight() ? tinycolor('black').toHexString() : tinycolor('white').toHexString()
    }

    return {
        buttonBackgroundColor: tinycolor(baseColor).setAlpha(1).toRgbString(), // Changed to 50% opacity
        buttonIconColor: getContrastingColor(base),
        chatWindowBackgroundColor: tinycolor(baseColor).lighten(20).toHexString(),
        chatWindowPoweredByTextColor: getContrastingColor(tinycolor(baseColor).lighten(20)),
        botMessageBackgroundColor: tinycolor(baseColor).lighten(50).toHexString(),
        botMessageTextColor: getContrastingColor(tinycolor(baseColor).lighten(50)),
        userMessageBackgroundColor: tinycolor(baseColor).lighten(10).toHexString(),
        userMessageTextColor: getContrastingColor(tinycolor(baseColor).lighten(10)),
        textInputSendButtonColor: tinycolor(baseColor).toHexString(),
        feedbackColor: tinycolor(baseColor).toHexString(),
        textInputBackgroundColor: '#ffffff',
        textInputTextColor: getContrastingColor(tinycolor('#ffffff')),
        footerTextColor: getContrastingColor(tinycolor(baseColor))
    }
}

export default generateThemeColors
