module.exports = {
    // Use ts-jest preset for testing TypeScript files with Jest
    preset: 'ts-jest',
    // Set the test environment to Node.js
    testEnvironment: 'node',
    globals: {
        'ts-jest': {
            diagnostics: false
        }
    },

    // Define the root directory for tests and modules
    roots: ['<rootDir>/test'],

    // Use ts-jest to transform TypeScript files
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },

    // Regular expression to find test files
    testRegex: '((\\.|/)index\\.test)\\.tsx?$',

    // File extensions to recognize in module resolution
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
        '^flowise-components$': '<rootDir>/test/__mocks__/flowise-components.ts'
    },

    // Display individual test results with the test suite hierarchy.
    verbose: true
}
