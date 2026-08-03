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
    coverageThreshold: (() => {
        const FLOOR = { branches: 80, functions: 80, lines: 80, statements: 80 }
        return {
            // Folder-level — every file under these paths has direct tests
            // (atoms/StatusIndicator is partially covered but the folder
            // aggregate stays well above the floor).
            './src/atoms/': FLOOR,
            './src/core/primitives/': FLOOR,
            './src/core/theme/': FLOOR,
            './src/core/utils/': FLOOR,
            './src/features/executions/hooks/': FLOOR,
            './src/infrastructure/store/': FLOOR,

            // Tested subset of components — extglob excludes the untested
            // orchestrators (ExecutionsListTable / ExecutionsViewer). Promote
            // this to the folder level once those land tests.
            './src/features/executions/components/!(ExecutionsListTable|ExecutionsViewer).{ts,tsx}': FLOOR,

            // executions.ts has direct tests; client.ts is exercised only
            // indirectly through executions.ts so it's not threshold-gated.
            './src/infrastructure/api/executions.ts': FLOOR
        }
    })(),
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
