import { resolve } from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react()],
    resolve: {
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
