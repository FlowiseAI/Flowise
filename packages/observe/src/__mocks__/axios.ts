// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAxios: any = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
    },
    defaults: { headers: { common: {} } }
}
mockAxios.create = jest.fn(() => mockAxios)

export default mockAxios
