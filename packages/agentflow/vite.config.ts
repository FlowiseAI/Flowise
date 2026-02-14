import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/__test_utils__/**'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FlowiseAgentflow',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'umd.js'}`,
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
        '@emotion/styled',
        'reactflow',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          '@mui/material': 'MaterialUI',
          '@mui/material/styles': 'MaterialUIStyles',
          '@emotion/react': 'emotionReact',
          '@emotion/styled': 'emotionStyled',
          reactflow: 'ReactFlow',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'flowise.css'
          return assetInfo.name || 'asset'
        },
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
})
