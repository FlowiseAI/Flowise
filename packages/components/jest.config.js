module.exports = {
    // Use ts-jest preset for testing TypeScript files with Jest
    preset: 'ts-jest',
    // Set the test environment to Node.js
    testEnvironment: 'node',

    // Define the root directory for tests and modules
    roots: ['<rootDir>/test'],

    // Use ts-jest to transform TypeScript files
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },

    // Find test files
    testMatch: ['**/test/**/*.test.ts', '**/test/**/*.test.tsx'],

    // File extensions to recognize in module resolution
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    // Add moduleNameMapper to mock specific modules
    moduleNameMapper: {
        '^axios$': '<rootDir>/test/mocks/axios.ts'
    },

    // Display individual test results with the test suite hierarchy.
    verbose: true
}
