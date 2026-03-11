import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development'

    return {
        plugins: [
            react(),
            dts({
                insertTypesEntry: true,
                include: ['src/**/*'],
                exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx']
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
                name: 'FlowiseAgentExecutions',
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
                    '@mui/x-tree-view',
                    '@mui/x-tree-view/RichTreeView',
                    '@mui/x-tree-view/useTreeItem2',
                    '@mui/x-tree-view/TreeItem2',
                    '@mui/x-tree-view/TreeItem2Icon',
                    '@mui/x-tree-view/TreeItem2Provider',
                    '@mui/x-tree-view/TreeItem2DragAndDropOverlay',
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
                        '@mui/x-tree-view/RichTreeView': 'RichTreeView',
                        '@mui/x-tree-view/useTreeItem2': 'useTreeItem2',
                        '@mui/x-tree-view/TreeItem2': 'TreeItem2',
                        '@mui/x-tree-view/TreeItem2Icon': 'TreeItem2Icon',
                        '@mui/x-tree-view/TreeItem2Provider': 'TreeItem2Provider',
                        '@mui/x-tree-view/TreeItem2DragAndDropOverlay': 'TreeItem2DragAndDropOverlay',
                        '@emotion/react': 'emotionReact',
                        '@emotion/styled': 'emotionStyled'
                    },
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name === 'style.css') return 'styles.css'
                        return assetInfo.name || 'asset'
                    }
                }
            },
            cssCodeSplit: false,
            sourcemap: isDev ? true : false
        }
    }
})
