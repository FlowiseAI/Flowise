module.exports = {
    roots: ['<rootDir>/src'],
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/**/*.test.js'],
    testPathIgnorePatterns: ['/node_modules/', '/build/'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass|svg|png|jpg|jpeg|gif|webp)$': '<rootDir>/src/__mocks__/styleMock.js',
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    transform: {
        '^.+\\.jsx?$': 'babel-jest'
    },
    transformIgnorePatterns: ['/node_modules/']
}
