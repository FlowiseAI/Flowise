module.exports = {
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
    plugins: ['react', 'react-hooks', '@typescript-eslint', 'unused-imports', 'jsx-a11y', 'simple-import-sort', 'import'],
    ignorePatterns: ['dist', 'node_modules', 'build', 'vite.config.ts', 'examples/dist'],
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
                    // Side effect imports
                    ['^\\u0000'],
                    // React and React-related packages first
                    ['^react', '^react-dom'],
                    // Other external packages (starting with @ or letter)
                    ['^@?\\w'],
                    // Internal packages (using @ alias)
                    ['^@/'],
                    // Parent imports (../)
                    ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
                    // Same directory imports (./)
                    ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
                    // Type imports
                    ['^.+\\.?(css|scss)$']
                ]
            }
        ],
        'simple-import-sort/exports': 'error',
        'import/first': 'error',
        'import/newline-after-import': 'error',
        'import/no-duplicates': 'error',
        'prettier/prettier': 'error',
        // Architectural boundary enforcement
        'import/no-restricted-paths': [
            'error',
            {
                zones: [
                    // atoms/ can only import from core/types (not from features, infrastructure, or core utils)
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
                        except: ['./types'],
                        message: 'Atoms can only import types from core/types, not utilities or business logic.'
                    },
                    // core/ cannot import from anything (leaf node)
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
                    // infrastructure/ can only import from core/
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
                    // features/ cannot import from other features (prevent cross-feature dependencies)
                    {
                        target: './src/features/canvas',
                        from: './src/features',
                        except: ['./canvas'],
                        message: 'Features cannot import from other features. Move shared logic to core.'
                    },
                    {
                        target: './src/features/generator',
                        from: './src/features',
                        except: ['./generator'],
                        message: 'Features cannot import from other features. Move shared logic to core.'
                    },
                    {
                        target: './src/features/node-editor',
                        from: './src/features',
                        except: ['./node-editor'],
                        message: 'Features cannot import from other features. Move shared logic to core.'
                    },
                    {
                        target: './src/features/node-palette',
                        from: './src/features',
                        except: ['./node-palette'],
                        message: 'Features cannot import from other features. Move shared logic to core.'
                    }
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
            files: ['examples/**/*.{js,jsx,ts,tsx}'],
            rules: {
                'no-console': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off'
            }
        }
    ]
}
