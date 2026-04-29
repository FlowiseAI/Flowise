import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '')
    // VITE_INSTANCE_URL points at a remote instance; BACKEND_URL overrides the local dev server port.
    const backendUrl = env.VITE_INSTANCE_URL || 'http://localhost:3000'

    return {
        plugins: [react()],
        root: __dirname,
        resolve: {
            alias: {
                // Use the source files directly for development
                '@flowiseai/agentflow': path.resolve(__dirname, '../src'),
                '@': path.resolve(__dirname, '../src')
            }
        },
        server: {
            port: 5174,
            proxy: {
                '/api': backendUrl
            },
            watch: {
                ignored: ['!**/packages/agentflow/src/**']
            }
        },
        optimizeDeps: {
            include: ['react', 'react-dom', '@mui/material', 'reactflow']
        }
    }
})
