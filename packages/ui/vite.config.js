import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dotenv from 'dotenv'

export default defineConfig(async ({ mode }) => {
    let proxy = undefined
    if (mode === 'development') {
        const serverPort = parseInt(dotenv.config({ processEnv: {}, path: '../server/.env' }).parsed?.['PORT'])
        if (!Number.isNaN(serverPort) && serverPort > 0 && serverPort < 65535) {
            proxy = {
                '/api': {
                    target: `http://localhost:${serverPort}`,
                    changeOrigin: true
                },
                '/socket.io': {
                    target: `http://localhost:${serverPort}`,
                    changeOrigin: true
                }
            }
        }
    }
    dotenv.config()
    return {
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
            proxy,
            port: process.env.VITE_PORT ?? 8080,
            host: process.env.VITE_HOST
        }
    }
})
