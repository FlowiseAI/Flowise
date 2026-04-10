module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/nodes', '<rootDir>/src'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    verbose: true,
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    moduleNameMapper: {
        '^../../../src/(.*)$': '<rootDir>/src/$1',
        // @modelcontextprotocol/sdk is ESM-only (type:module, no exports map, no CJS builds).
        // It cannot be require()'d in Jest's CJS environment and crashes the worker.
        // The MCP core tests only exercise pure validation functions that don't
        // use these imports, so stubbing them out is safe.
        // Note: @langchain/core is NOT stubbed here because it ships CJS builds
        // (e.g. tools.cjs) that Jest can require() normally.
        '^@modelcontextprotocol/sdk/(.*)$': '<rootDir>/__mocks__/esm-stub.js',
        // multer-azure-blob-storage transitively pulls in azure-storage -> request@2.88.2 -> uuid/v4.
        // The uuid/v4 sub-path no longer exists in modern uuid versions, breaking module resolution.
        // Tests don't exercise Azure storage, so stubbing it out avoids the chain entirely.
        '^multer-azure-blob-storage$': '<rootDir>/__mocks__/esm-stub.js'
    }
}
