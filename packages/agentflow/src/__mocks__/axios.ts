/**
 * Mock for axios library
 *
 * Prevents network errors in tests by mocking all HTTP requests.
 * Returns mock data for common API endpoints.
 */

const mockAxios: any = {
    create: jest.fn(function () {
        return mockAxios
    }),
    defaults: {
        headers: {
            common: {}
        }
    },
    interceptors: {
        request: {
            use: jest.fn(),
            eject: jest.fn()
        },
        response: {
            use: jest.fn(),
            eject: jest.fn()
        }
    },
    get: jest.fn(() => Promise.resolve({ data: [] })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    request: jest.fn(() => Promise.resolve({ data: {} }))
}

export default mockAxios
