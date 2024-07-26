import { INode, INodeParams } from '../../../src/Interface'

class StickyNote implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Sticky Note'
        this.name = 'stickyNote'
        this.version = 1.0
        this.type = 'StickyNote'
        this.icon = 'stickyNote.svg'
        this.category = 'Utilities'
        this.description = 'Add a sticky note'
        this.inputs = [
            {
                label: '',
                name: 'note',
                type: 'string',
                rows: 1,
                placeholder: 'Type something here',
                optional: true
            }
        ]
        this.baseClasses = [this.type]
    }

    async init(): Promise<any> {
        return new StickyNote()
    }
}

module.exports = { nodeClass: StickyNote }
