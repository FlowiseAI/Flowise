class TestAgentflowNode {
    async run(nodeData, finalInput) {
        const output = nodeData.inputs?.testOutput ?? { content: nodeData.label }
        return {
            id: nodeData.id,
            name: nodeData.name,
            input: {
                content: finalInput ?? ''
            },
            output,
            state: nodeData.inputs?.testState ?? {}
        }
    }
}

module.exports = { nodeClass: TestAgentflowNode }
