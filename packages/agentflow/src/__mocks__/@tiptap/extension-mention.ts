const Mention = {
    extend: jest.fn(() => ({
        configure: jest.fn(() => 'CustomMention')
    })),
    configure: jest.fn(() => 'Mention')
}
export default Mention
