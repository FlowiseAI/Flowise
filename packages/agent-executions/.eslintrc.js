module.exports = {
    root: true,
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    settings: {
        react: {
            version: 'detect'
        }
    },
    plugins: ['react', 'react-hooks', '@typescript-eslint', 'jsx-a11y'],
    ignorePatterns: ['dist', 'node_modules', 'build', 'vite.config.ts', '**/*.json'],
    rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-unused-vars': 'off',
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',
        'prettier/prettier': 'error'
    },
    env: {
        browser: true,
        es2021: true,
        node: true
    }
}
