import { darken } from '@mui/material/styles'

import { createObserveTheme } from '@/core/theme'

import { getRoleColors } from './roleColors'

const lightTheme = createObserveTheme(false)
const darkTheme = createObserveTheme(true)

describe('getRoleColors', () => {
    describe('light mode', () => {
        it.each([
            ['assistant', 'success'] as const,
            ['ai', 'success'] as const,
            ['system', 'warning'] as const,
            ['developer', 'info'] as const,
            ['user', 'primary'] as const,
            ['human', 'primary'] as const,
            ['tool', 'secondary'] as const,
            ['function', 'secondary'] as const
        ])('maps role "%s" to the %s palette in light mode', (role, paletteKey) => {
            const colors = getRoleColors(role, lightTheme, false)
            // user/human use the *main* shade for the primary palette in legacy
            const expectedBg = paletteKey === 'primary' ? lightTheme.palette.primary.light : lightTheme.palette[paletteKey].light
            expect(colors.bg).toBe(expectedBg)
            expect(colors.color).toBe(lightTheme.palette[paletteKey].dark)
            expect(colors.border).toBe(lightTheme.palette[paletteKey].main)
        })

        it('falls back to a grey palette for unknown roles in light mode', () => {
            const colors = getRoleColors('observer', lightTheme, false)
            expect(colors.bg).toBe(lightTheme.palette.grey[300])
            expect(colors.color).toBe(lightTheme.palette.grey[800])
            expect(colors.border).toBe(lightTheme.palette.grey[500])
        })
    })

    describe('dark mode', () => {
        it.each([
            ['assistant', 'success'] as const,
            ['system', 'warning'] as const,
            ['developer', 'info'] as const,
            ['tool', 'secondary'] as const
        ])('darkens the palette and uses white text for role "%s" (palette: %s) in dark mode', (role, paletteKey) => {
            const colors = getRoleColors(role, darkTheme, true)
            const baseDark =
                paletteKey === 'success' || paletteKey === 'warning' || paletteKey === 'info'
                    ? darkTheme.palette[paletteKey].dark
                    : darkTheme.palette[paletteKey].main
            expect(colors.bg).toBe(darken(baseDark, 0.5))
            expect(colors.color).toBe(darkTheme.palette.common.white)
            expect(colors.border).toBe(darkTheme.palette[paletteKey].main)
        })

        it('uses the primary.main shade darkened for user/human in dark mode', () => {
            const colors = getRoleColors('user', darkTheme, true)
            expect(colors.bg).toBe(darken(darkTheme.palette.primary.main, 0.5))
            expect(colors.color).toBe(darkTheme.palette.common.white)
            expect(colors.border).toBe(darkTheme.palette.primary.main)
        })

        it('falls back to a darkened grey palette for unknown roles in dark mode', () => {
            const colors = getRoleColors('observer', darkTheme, true)
            expect(colors.bg).toBe(darken(darkTheme.palette.grey[700], 0.5))
            expect(colors.color).toBe(darkTheme.palette.common.white)
            expect(colors.border).toBe(darkTheme.palette.grey[600])
        })
    })
})
