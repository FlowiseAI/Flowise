/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json',
                useESM: true
            }
        ]
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    extensionsToTreatAsEsm: ['.ts'],
    globals: {
        'ts-jest': {
            useESM: true
        }
    },
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
    transformIgnorePatterns: [
        'node_modules/(?!(langfuse-node|@langfuse/web|@langfuse/shared|@langfuse/node|@langfuse/web|@langfuse/shared)/)'
    ],
    globalSetup: './test/globalSetup.ts',
    globalTeardown: './test/globalTeardown.ts'
}
