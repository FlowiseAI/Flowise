module.exports = {
    // Use ts-jest preset for testing TypeScript files with Jest
    preset: 'ts-jest',
    // Set the test environment to Node.js
    testEnvironment: 'node',

    // Define the root directory for tests and modules
    roots: ['<rootDir>/src'],

    // Use ts-jest to transform TypeScript files
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },

    // Regular expression to find test files
    testRegex: '.*\\.test\\.tsx?$',

    // File extensions to recognize in module resolution
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    // uuid v10+ ships ESM-only; redirect to the CJS dist so Jest can require it.
    // typeorm is not resolvable via pnpm symlinks in the test runner; redirect to
    // the shared manual mock so all test files get the same decorator stubs without
    // needing an inline jest.mock() factory.
    moduleNameMapper: {
        '^uuid$': '<rootDir>/node_modules/uuid/dist/index.js',
        '^typeorm$': '<rootDir>/__mocks__/typeorm.ts'
    },

    // Include the package's own node_modules so that Jest can resolve
    // symlinked pnpm dependencies when tests live inside src/
    modulePaths: ['<rootDir>/node_modules'],

    // Display individual test results with the test suite hierarchy.
    verbose: true
}
