import { INodeData } from '../Interface'

export const validateNodeConnections = (nodeData: INodeData): string | null => {
    const requiredInputs =
        nodeData.inputAnchors.filter((input) => !input.optional).map((input) => ({ name: input.name, label: input.label })) ?? []
    const missingInputs = requiredInputs.filter((input) => !nodeData.inputs?.[input.name])

    if (missingInputs.length > 0) {
        return missingInputs.map((input) => `${input.label}`).join(', ')
    }
    return null
}
