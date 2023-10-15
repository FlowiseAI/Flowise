import path from 'path'
import { FlowisePlugin } from 'flowise/dist/Plugin'

class MyPlugin extends FlowisePlugin {
    name = 'MyFirstPlugin'
    dirname = __dirname
    nodesPath = path.join(this.dirname, 'nodes')

    constructor() {
        super()
        this.logger.debug('### MyPlugin loaded successfully ###')
    }

    initialize() {
        super.initialize()
        this.logger.debug(`### ${this.name} initialized ###`)
    }
}

export default MyPlugin
