import { resolve } from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development'

    return {
        plugins: [
            react(),
            dts({
                insertTypesEntry: true,
                include: ['src/**/*'],
                exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__*__/**']
            })
        ],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src')
            }
        },
        build: {
            lib: {
                entry: resolve(__dirname, 'src/index.ts'),
                name: 'FlowiseObserve',
                formats: ['es', 'umd'],
                fileName: (format) => `index.${format === 'es' ? 'js' : 'umd.js'}`
            },
            rollupOptions: {
                external: [
                    'react',
                    'react-dom',
                    'react/jsx-runtime',
                    '@mui/material',
                    '@mui/material/styles',
                    '@mui/icons-material',
                    '@emotion/react',
                    '@emotion/styled'
                ],
                output: {
                    globals: {
                        react: 'React',
                        'react-dom': 'ReactDOM',
                        'react/jsx-runtime': 'jsxRuntime',
                        '@mui/material': 'MaterialUI',
                        '@mui/material/styles': 'MaterialUIStyles',
                        '@mui/icons-material': 'MaterialUIIcons',
                        '@emotion/react': 'emotionReact',
                        '@emotion/styled': 'emotionStyled'
                    }
                }
            },
            sourcemap: isDev ? true : false
        }
    }
})
