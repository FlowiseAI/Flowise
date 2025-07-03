const { nodeClass: OriginalOpenAIAssistant } = require('./OpenAIAssistant')

// AAI-branded clone of OpenAIAssistant that relies on AAI default credentials
class AAIAssistant_Agents extends (OriginalOpenAIAssistant as any) {
    constructor() {
        super()
        this.label = 'AAI Assistant'
        this.name = 'aaiAssistant'
        this.description = 'OpenAI Assistant • Zero configuration required'
        this.tags = ['AAI'] // Ensure Answer tab detection
    }
}

module.exports = { nodeClass: AAIAssistant_Agents } 