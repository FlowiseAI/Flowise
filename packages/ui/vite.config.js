import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    plugins: [
        react(),
        VitePWA({
            manifest: {
                name: 'FlowiseAI - Build LLMs Apps Easily',
                short_name: 'Flowise',
                theme_color: '#00000000',
                icons: [
                    {
                        src: '/public/favicon-32x32.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ]
})
