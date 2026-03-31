// Shared config inherited by both project types
const baseConfig = {
    preset: 'ts-jest',
    roots: ['<rootDir>/src'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json'
            }
        ]
    },
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/styleMock.js',
        '\\.svg$': '<rootDir>/src/__mocks__/styleMock.js',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@test-utils/(.*)$': '<rootDir>/src/__test_utils__/$1',
        // TipTap + lowlight ship ESM-only — Jest (CJS) cannot import them,
        // so we redirect to lightweight CJS stubs under src/__mocks__/.
        '^@tiptap/(.+)$': '<rootDir>/src/__mocks__/@tiptap/$1.ts',
        '^lowlight$': '<rootDir>/src/__mocks__/lowlight.ts',
        // Bypass React.lazy wrappers — resolve Foo.lazy → Foo so tests render synchronously
        '(.*)\\.lazy$': '$1'
    }
}

module.exports = {
    verbose: true,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/index.ts',
        '!src/__mocks__/**',
        '!src/__test_utils__/**',
        '!src/infrastructure/api/hooks/**'
    ],
    // text: per-folder table, text-summary: totals, lcov: HTML report at coverage/lcov-report/
    coverageReporters: ['text', 'text-summary', 'lcov'],
    coverageDirectory: 'coverage',
    // 80% floor to catch regressions without blocking active development.
    // Add new paths here as more modules gain test coverage.
    coverageThreshold: {
        './src/*.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/Agentflow.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/atoms/ArrayInput.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/atoms/ExpandTextDialog.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/atoms/MessagesInput.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/atoms/ScenariosInput.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        // Tier 3 UI atom — only the onChange/disabled/sync logic is tested, not styled internals
        './src/atoms/RichTextEditor.tsx': { branches: 30, functions: 50, lines: 50, statements: 50 },
        './src/core/': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/features/canvas/components/ConnectionLine.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        // Only getMinimumNodeHeight() is tested; the component is Tier 3 UI with no business logic
        './src/features/canvas/components/NodeOutputHandles.tsx': { branches: 0, functions: 10, lines: 30, statements: 30 },
        './src/features/canvas/containers/NodeInfoDialog.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/features/canvas/hooks/': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/features/generator/GenerateFlowDialog.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/features/node-editor/': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/features/node-palette/search.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/infrastructure/': { branches: 80, functions: 80, lines: 80, statements: 80 }
    },
    projects: [
        // .test.ts → node (fast, no DOM)
        {
            ...baseConfig,
            displayName: 'unit',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/src/**/*.test.ts']
        },
        // .test.tsx → jsdom (browser-like DOM for React components)
        {
            ...baseConfig,
            displayName: 'components',
            testEnvironment: '<rootDir>/src/__test_utils__/jest-environment-jsdom.js',
            testEnvironmentOptions: {
                customExportConditions: ['']
            },
            testMatch: ['<rootDir>/src/**/*.test.tsx'],
            setupFilesAfterEnv: ['@testing-library/jest-dom']
        }
    ]
}
