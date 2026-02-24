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
        '^@test-utils/(.*)$': '<rootDir>/src/__test_utils__/$1',
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/styleMock.js'
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
        // Potentially deprecated — exclude until resolved (see TESTS.md)
        '!src/infrastructure/api/hooks/useApi.ts'
    ],
    // text: per-folder table, text-summary: totals, lcov: HTML report at coverage/lcov-report/
    coverageReporters: ['text', 'text-summary', 'lcov'],
    coverageDirectory: 'coverage',
    // 80% floor to catch regressions without blocking active development.
    // Add new paths here as more modules gain test coverage.
    coverageThreshold: {
        './src/Agentflow.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/core/': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/features/node-palette/search.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/infrastructure/api/': { branches: 80, functions: 80, lines: 80, statements: 80 }
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
