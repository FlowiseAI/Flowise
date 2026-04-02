export const mergeAttributes = jest.fn((...attrs: Record<string, unknown>[]) => Object.assign({}, ...attrs))

export class PasteRule {
    find: unknown
    handler: unknown
    constructor(config: Record<string, unknown>) {
        this.find = config.find
        this.handler = config.handler
    }
}
