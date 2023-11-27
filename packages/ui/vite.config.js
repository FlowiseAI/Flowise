import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    root: resolve(__dirname),
    build: {
        outDir: './build'
    },
    server: {
        open: true,
        port: 8080
    }
})
