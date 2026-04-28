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
        '^canvas$': '<rootDir>/src/__mocks__/canvas.js',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@test-utils/(.*)$': '<rootDir>/src/__test_utils__/$1'
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
        '!src/__test_utils__/**'
    ],
    coverageReporters: ['text', 'text-summary', 'lcov'],
    coverageDirectory: 'coverage',
    coverageThreshold: {
        './src/features/executions/hooks/': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/infrastructure/api/executions.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
        './src/infrastructure/store/ObserveContext.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 }
    },
    projects: [
        {
            ...baseConfig,
            displayName: 'unit',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/src/**/*.test.ts']
        },
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
