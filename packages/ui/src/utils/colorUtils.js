/**
 * A lightweight color utility to replace tinycolor2
 */

class ColorUtil {
    constructor(colorInput) {
        this.originalInput = colorInput
        this.rgb = { r: 0, g: 0, b: 0 }
        this.alpha = 1

        this.parse(colorInput)
    }

    parse(colorInput) {
        if (!colorInput) return

        // Handle hex format
        if (typeof colorInput === 'string' && colorInput.startsWith('#')) {
            const hex = colorInput.substring(1)

            if (hex.length === 3) {
                this.rgb = {
                    r: parseInt(hex[0] + hex[0], 16),
                    g: parseInt(hex[1] + hex[1], 16),
                    b: parseInt(hex[2] + hex[2], 16)
                }
            } else if (hex.length === 6) {
                this.rgb = {
                    r: parseInt(hex.substring(0, 2), 16),
                    g: parseInt(hex.substring(2, 4), 16),
                    b: parseInt(hex.substring(4, 6), 16)
                }
            }
            return
        }

        // Handle named colors (limited set)
        const namedColors = {
            black: { r: 0, g: 0, b: 0 },
            white: { r: 255, g: 255, b: 255 }
            // Add more named colors if needed
        }

        if (typeof colorInput === 'string' && namedColors[colorInput.toLowerCase()]) {
            this.rgb = namedColors[colorInput.toLowerCase()]
            return
        }

        // Handle rgb/rgba strings
        if (typeof colorInput === 'string' && (colorInput.startsWith('rgb') || colorInput.startsWith('rgba'))) {
            const parts = colorInput.match(/\d+/g)
            if (parts && parts.length >= 3) {
                this.rgb = {
                    r: parseInt(parts[0]),
                    g: parseInt(parts[1]),
                    b: parseInt(parts[2])
                }

                if (parts.length === 4) {
                    this.alpha = parseFloat(parts[3])
                }
            }
            return
        }

        // Handle object notation
        if (typeof colorInput === 'object' && colorInput !== null) {
            if ('r' in colorInput && 'g' in colorInput && 'b' in colorInput) {
                this.rgb = {
                    r: colorInput.r,
                    g: colorInput.g,
                    b: colorInput.b
                }

                if ('a' in colorInput) {
                    this.alpha = colorInput.a
                }
            }
        }
    }

    isLight() {
        // Calculate perceived brightness using the formula:
        // (0.299*R + 0.587*G + 0.114*B)
        const brightness = (0.299 * this.rgb.r + 0.587 * this.rgb.g + 0.114 * this.rgb.b) / 255
        return brightness > 0.5
    }

    toHexString() {
        const toHex = (num) => {
            const hex = Math.round(Math.min(255, Math.max(0, num))).toString(16)
            return hex.length === 1 ? '0' + hex : hex
        }

        return `#${toHex(this.rgb.r)}${toHex(this.rgb.g)}${toHex(this.rgb.b)}`
    }

    toRgbString() {
        if (this.alpha < 1) {
            return `rgba(${Math.round(this.rgb.r)}, ${Math.round(this.rgb.g)}, ${Math.round(this.rgb.b)}, ${this.alpha})`
        }
        return `rgb(${Math.round(this.rgb.r)}, ${Math.round(this.rgb.g)}, ${Math.round(this.rgb.b)})`
    }

    setAlpha(alpha) {
        this.alpha = Math.min(1, Math.max(0, alpha))
        return this
    }

    lighten(amount) {
        const lightenColor = (value) => {
            return Math.min(255, Math.max(0, Math.round(value + (255 - value) * (amount / 100))))
        }

        this.rgb = {
            r: lightenColor(this.rgb.r),
            g: lightenColor(this.rgb.g),
            b: lightenColor(this.rgb.b)
        }

        return this
    }
}

// Factory function to mimic tinycolor's API
function colorUtil(colorInput) {
    return new ColorUtil(colorInput)
}

export default colorUtil
