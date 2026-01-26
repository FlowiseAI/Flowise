import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import postcss from 'rollup-plugin-postcss'
import json from '@rollup/plugin-json'

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/index.js',
            format: 'cjs',
            sourcemap: true,
            exports: 'named'
        },
        {
            file: 'dist/index.esm.js',
            format: 'esm',
            sourcemap: true
        }
    ],
    plugins: [
        peerDepsExternal(),
        resolve({
            extensions: ['.ts', '.tsx', '.js', '.jsx']
        }),
        commonjs(),
        json(),
        typescript({
            tsconfig: './tsconfig.json',
            declaration: true,
            declarationDir: 'dist'
        }),
        postcss({
            extract: 'flowise.css',
            minimize: true
        })
    ],
    external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@mui/material',
        '@mui/icons-material',
        '@mui/system',
        '@emotion/react',
        '@emotion/styled',
        'reactflow',
        '@tabler/icons-react',
        '@reduxjs/toolkit',
        'react-redux',
        'redux',
        'lodash',
        'axios',
        'uuid',
        'react-rewards',
        'prop-types',
        'clsx'
    ]
}
