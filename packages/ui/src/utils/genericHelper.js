import moment from 'moment'

export const getUniqueNodeId = (nodeData, nodes) => {
    // Get amount of same nodes
    let totalSameNodes = 0
    for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i]
        if (node.data.name === nodeData.name) {
            totalSameNodes += 1
        }
    }

    // Get unique id
    let nodeId = `${nodeData.name}_${totalSameNodes}`
    for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i]
        if (node.id === nodeId) {
            totalSameNodes += 1
            nodeId = `${nodeData.name}_${totalSameNodes}`
        }
    }
    return nodeId
}

export const initializeNodeData = (nodeParams) => {
    const initialValues = {}

    for (let i = 0; i < nodeParams.length; i += 1) {
        const input = nodeParams[i]

        // Load from nodeParams default values
        initialValues[input.name] = input.default || ''

        // Special case for array, always initialize the item if default is not set
        if (input.type === 'array' && !input.default) {
            const newObj = {}
            for (let j = 0; j < input.array.length; j += 1) {
                newObj[input.array[j].name] = input.array[j].default || ''
            }
            initialValues[input.name] = [newObj]
        }
    }

    return initialValues
}

export const initNode = (nodeData, newNodeId) => {
    const inputAnchors = []
    const incoming = nodeData.inputs ? nodeData.inputs.length : 0
    const outgoing = 1

    const whitelistTypes = ['asyncOptions', 'options', 'string', 'number', 'boolean', 'password', 'json', 'code', 'date', 'file', 'folder']

    for (let i = 0; i < incoming; i += 1) {
        if (whitelistTypes.includes(nodeData.inputs[i].type)) continue
        const newInput = {
            ...nodeData.inputs[i],
            id: `${newNodeId}-input-${nodeData.inputs[i].name}-${nodeData.inputs[i].type}`
        }
        inputAnchors.push(newInput)
    }

    const outputAnchors = []
    for (let i = 0; i < outgoing; i += 1) {
        const newOutput = {
            id: `${newNodeId}-output-${nodeData.name}-${nodeData.baseClasses.join('|')}`,
            name: nodeData.name,
            label: nodeData.type,
            type: nodeData.baseClasses.join(' | ')
        }
        outputAnchors.push(newOutput)
    }

    nodeData.id = newNodeId
    nodeData.inputAnchors = inputAnchors
    nodeData.outputAnchors = outputAnchors

    /*
    Initial inputs = [
        {
            label: 'field_label',
            name: 'field'
        }
    ]

    // Turn into inputs object with default values
    Converted inputs = { 'field': 'defaultvalue' }
    
    // Move remaining inputs that are not part of inputAnchors to inputParams 
    inputParams = [
        {
            label: 'field_label',
            name: 'field'
        }
    ]
    */
    if (nodeData.inputs) {
        nodeData.inputParams = nodeData.inputs.filter(({ name }) => !nodeData.inputAnchors.some((exclude) => exclude.name === name))
        nodeData.inputs = initializeNodeData(nodeData.inputs)
    } else {
        nodeData.inputParams = []
        nodeData.inputs = {}
    }

    return nodeData
}

export const getEdgeLabelName = (source) => {
    const sourceSplit = source.split('-')
    if (sourceSplit.length && sourceSplit[0].includes('ifElse')) {
        const outputAnchorsIndex = sourceSplit[sourceSplit.length - 1]
        return outputAnchorsIndex === '0' ? 'true' : 'false'
    }
    return ''
}

export const isValidConnection = (connection, reactFlowInstance) => {
    const sourceHandle = connection.sourceHandle
    const targetHandle = connection.targetHandle
    const target = connection.target

    //sourceHandle: "llmChain_0-output-llmChain-BaseChain"
    //targetHandle: "mrlkAgentLLM_0-input-model-BaseLanguageModel"

    const sourceTypes = sourceHandle.split('-')[sourceHandle.split('-').length - 1].split('|')
    const targetTypes = targetHandle.split('-')[targetHandle.split('-').length - 1].split('|')

    if (targetTypes.some((t) => sourceTypes.includes(t))) {
        let targetNode = reactFlowInstance.getNode(target)

        if (!targetNode) {
            if (!reactFlowInstance.getEdges().find((e) => e.targetHandle === targetHandle)) {
                return true
            }
        } else {
            const targetNodeInputAnchor = targetNode.data.inputAnchors.find((ancr) => ancr.id === targetHandle)
            if (
                (targetNodeInputAnchor &&
                    !targetNodeInputAnchor?.list &&
                    !reactFlowInstance.getEdges().find((e) => e.targetHandle === targetHandle)) ||
                targetNodeInputAnchor?.list
            ) {
                return true
            }
        }
    }

    return false
}

export const convertDateStringToDateObject = (dateString) => {
    if (dateString === undefined || !dateString) return undefined

    const date = moment(dateString)
    if (!date.isValid) return undefined

    // Sat Sep 24 2022 07:30:14
    return new Date(date.year(), date.month(), date.date(), date.hours(), date.minutes())
}

export const getFileName = (fileBase64) => {
    const splitDataURI = fileBase64.split(',')
    const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
    return filename
}

export const getFolderName = (base64ArrayStr) => {
    try {
        const base64Array = JSON.parse(base64ArrayStr)
        const filenames = []
        for (let i = 0; i < base64Array.length; i += 1) {
            const fileBase64 = base64Array[i]
            const splitDataURI = fileBase64.split(',')
            const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
            filenames.push(filename)
        }
        return filenames.length ? filenames.join(',') : ''
    } catch (e) {
        return ''
    }
}

export const generateExportFlowData = (flowData) => {
    const nodes = flowData.nodes
    const edges = flowData.edges

    for (let i = 0; i < nodes.length; i += 1) {
        nodes[i].selected = false
        const node = nodes[i]

        const newNodeData = {
            id: node.data.id,
            label: node.data.label,
            name: node.data.name,
            type: node.data.type,
            baseClasses: node.data.baseClasses,
            category: node.data.category,
            description: node.data.description,
            inputParams: node.data.inputParams,
            inputAnchors: node.data.inputAnchors,
            inputs: {},
            outputAnchors: node.data.outputAnchors,
            selected: false
        }

        // Remove password, file & folder
        if (node.data.inputs && Object.keys(node.data.inputs).length) {
            const nodeDataInputs = {}
            for (const input in node.data.inputs) {
                const inputParam = node.data.inputParams.find((inp) => inp.name === input)
                if (inputParam && inputParam.type === 'password') continue
                if (inputParam && inputParam.type === 'file') continue
                if (inputParam && inputParam.type === 'folder') continue
                nodeDataInputs[input] = node.data.inputs[input]
            }
            newNodeData.inputs = nodeDataInputs
        }

        nodes[i].data = newNodeData
    }
    const exportJson = {
        nodes,
        edges
    }
    return exportJson
}

export const copyToClipboard = (e) => {
    const src = e.src
    if (Array.isArray(src) || typeof src === 'object') {
        navigator.clipboard.writeText(JSON.stringify(src, null, '  '))
    } else {
        navigator.clipboard.writeText(src)
    }
}
