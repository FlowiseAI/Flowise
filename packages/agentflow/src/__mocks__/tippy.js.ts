const tippy = jest.fn(() => [
    {
        setProps: jest.fn(),
        destroy: jest.fn(),
        hide: jest.fn(),
        show: jest.fn()
    }
])
export default tippy
