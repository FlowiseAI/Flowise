import { PrivateNodeBase } from '../PrivateNodeBase'
import { Calculator } from '@langchain/community/tools/calculator'
import { getBaseClasses } from '../../../src/utils'

export class SamplePrivateNode extends PrivateNodeBase {
    constructor() {
        super()

        this.label = 'Sample'
        this.name = 'sample'
        this.version = 1.0
        this.type = 'Sample'
        this.icon = 'calculator.svg'
        this.category = 'Tools'
        this.description = ' - Sample description'
        this.baseClasses = [this.type, ...getBaseClasses(Calculator)]
    }
}

module.exports = { nodeClass: SamplePrivateNode }
