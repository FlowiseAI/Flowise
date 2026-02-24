module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/nodes', '<rootDir>/src', '<rootDir>/test'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    verbose: true,
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    moduleNameMapper: {
        '^../../../src/(.*)$': '<rootDir>/src/$1',
        // @modelcontextprotocol/sdk and @langchain/core are ESM-only packages.
        // They cannot be require()'d in Jest's CJS environment and crash the worker.
        // The MCP core tests only exercise pure validation functions that don't
        // use these imports, so stubbing them out is safe.
        '^@modelcontextprotocol/sdk/(.*)$': '<rootDir>/test/__mocks__/esm-stub.js',
        '^@langchain/core/(.*)$': '<rootDir>/test/__mocks__/esm-stub.js'
    }
}
