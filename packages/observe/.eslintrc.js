const features = ['executions']
const crossFeatureRules = features.map((feature) => ({
    target: `./src/features/${feature}`,
    from: './src/features',
    except: [`./${feature}`],
    message: 'Features cannot import from other features. Move shared logic to core.'
}))

module.exports = {
    root: true,
    extends: [
        'eslint:recommended',
        'plugin:markdown/recommended',
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
        },
        'import/resolver': {
            typescript: {
                project: './tsconfig.json'
            }
        }
    },
    plugins: ['react', 'react-hooks', '@typescript-eslint', 'unused-imports', 'jsx-a11y', 'simple-import-sort', 'import'],
    ignorePatterns: ['dist', 'node_modules', 'build', 'vite.config.ts', 'examples/dist', '**/*.json'],
    rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'warn',
        'unused-imports/no-unused-vars': [
            'warn',
            {
                vars: 'all',
                varsIgnorePattern: '^_',
                args: 'after-used',
                argsIgnorePattern: '^_'
            }
        ],
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',
        'simple-import-sort/imports': [
            'error',
            {
                groups: [
                    ['^\\u0000'],
                    ['^react', '^react-dom'],
                    ['^@?\\w'],
                    ['^@/'],
                    ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
                    ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
                    ['^.+\\.?(css|scss)$']
                ]
            }
        ],
        'simple-import-sort/exports': 'error',
        'import/first': 'error',
        'import/newline-after-import': 'error',
        'import/no-duplicates': 'error',
        'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],
        'prettier/prettier': 'error',
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    {
                        group: ['@/features', '@/features/*'],
                        message:
                            '@/features alias is not allowed. Features use relative imports internally; other layers cannot import from features.'
                    }
                ]
            }
        ],
        'import/no-restricted-paths': [
            'error',
            {
                zones: [
                    {
                        target: './src/atoms',
                        from: './src/features',
                        message: 'Atoms cannot import from features. Keep atoms dumb and reusable.'
                    },
                    {
                        target: './src/atoms',
                        from: './src/infrastructure',
                        message: 'Atoms cannot import from infrastructure. Use props instead of contexts.'
                    },
                    {
                        target: './src/atoms',
                        from: './src/core',
                        except: ['./types', './theme', './primitives'],
                        message: 'Atoms can only import from core/types, core/theme, and core/primitives.'
                    },
                    {
                        target: './src/core',
                        from: './src/atoms',
                        message: 'Core is a leaf node and cannot import from atoms.'
                    },
                    {
                        target: './src/core',
                        from: './src/features',
                        message: 'Core is a leaf node and cannot import from features.'
                    },
                    {
                        target: './src/core',
                        from: './src/infrastructure',
                        message: 'Core is a leaf node and cannot import from infrastructure.'
                    },
                    {
                        target: './src/infrastructure',
                        from: './src/atoms',
                        message: 'Infrastructure cannot import from atoms. Move shared code to core.'
                    },
                    {
                        target: './src/infrastructure',
                        from: './src/features',
                        message: 'Infrastructure cannot import from features. Move shared code to core.'
                    },
                    ...crossFeatureRules
                ]
            }
        ]
    },
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    overrides: [
        {
            files: ['examples/**/*.{js,jsx,ts,tsx}', '**/*.md/**'],
            rules: {
                'no-console': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                // Code blocks in docs are illustrative snippets, not compilable modules
                'react/jsx-no-undef': 'off',
                'no-undef': 'off',
                'simple-import-sort/imports': 'off',
                'import/first': 'off',
                'prettier/prettier': 'off',
                'unused-imports/no-unused-vars': 'off'
            }
        },
        {
            files: ['src/__test_utils__/**/*.js'],
            rules: {
                '@typescript-eslint/no-require-imports': 'off'
            }
        }
    ]
}
