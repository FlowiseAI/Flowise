import { resolve } from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react()],
    resolve: {
        // Dedupe React, MUI, and Emotion so the SDK source (../src/...) and the
        // example app share a single instance of each. Without this, MUI's
        // ThemeContext is registered in one copy of @mui/material and read
        // from another, which silently falls back to MUI defaults (e.g. the
        // <Chip color='secondary'> renders MUI default #9c27b0 instead of
        // our theme's #673ab7).
        dedupe: ['react', 'react-dom', '@mui/material', '@mui/system', '@emotion/react', '@emotion/styled'],
        alias: {
            '@flowiseai/observe/observe.css': resolve(__dirname, '../src/observe.css'),
            '@flowiseai/observe': resolve(__dirname, '../src/index.ts'),
            '@': resolve(__dirname, '../src')
        }
    },
    root: resolve(__dirname),
    build: {
        outDir: resolve(__dirname, 'dist')
    }
})
