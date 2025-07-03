const { nodeClass: OriginalToolAgent } = require('./ToolAgent')

// AAI-branded clone of ToolAgent for Answer tab
class AAIToolAgent_Agents extends (OriginalToolAgent as any) {
    constructor(fields?: { sessionId?: string }) {
        super(fields)
        this.label = 'AAI Tool Agent'
        this.name = 'aaiToolAgent'
        this.description = 'Tool Agent • Zero configuration required'
        this.tags = ['AAI']
    }
}

module.exports = { nodeClass: AAIToolAgent_Agents } 