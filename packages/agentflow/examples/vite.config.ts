import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    root: __dirname,
    resolve: {
        alias: {
            // Use the source files directly for development
            '@flowise/agentflow': path.resolve(__dirname, '../src'),
            '@': path.resolve(__dirname, '../src')
        }
    },
    server: {
        port: 5174,
        // Watch the parent src directory for changes
        watch: {
            // Include the agentflow source directory
            ignored: ['!**/packages/agentflow/src/**']
        }
    },
    optimizeDeps: {
        include: ['react', 'react-dom', '@mui/material', 'reactflow']
    }
})
