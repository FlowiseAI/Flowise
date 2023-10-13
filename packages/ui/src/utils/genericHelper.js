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

export const initializeDefaultNodeData = (nodeParams) => {
    const initialValues = {}

    for (let i = 0; i < nodeParams.length; i += 1) {
        const input = nodeParams[i]
        initialValues[input.name] = input.default || ''
    }

    return initialValues
}

export const initNode = (nodeData, newNodeId) => {
    const inputAnchors = []
    const inputParams = []
    const incoming = nodeData.inputs ? nodeData.inputs.length : 0
    const outgoing = 1

    const whitelistTypes = [
        'asyncOptions',
        'options',
        'multiOptions',
        'string',
        'number',
        'boolean',
        'password',
        'json',
        'code',
        'date',
        'file',
        'folder'
    ]

    // Inputs
    for (let i = 0; i < incoming; i += 1) {
        const newInput = {
            ...nodeData.inputs[i],
            id: `${newNodeId}-input-${nodeData.inputs[i].name}-${nodeData.inputs[i].type}`
        }
        if (whitelistTypes.includes(nodeData.inputs[i].type)) {
            inputParams.push(newInput)
        } else {
            inputAnchors.push(newInput)
        }
    }

    // Credential
    if (nodeData.credential) {
        const newInput = {
            ...nodeData.credential,
            id: `${newNodeId}-input-${nodeData.credential.name}-${nodeData.credential.type}`
        }
        inputParams.unshift(newInput)
    }

    // Outputs
    const outputAnchors = []
    for (let i = 0; i < outgoing; i += 1) {
        if (nodeData.outputs && nodeData.outputs.length) {
            const options = []
            for (let j = 0; j < nodeData.outputs.length; j += 1) {
                let baseClasses = ''
                let type = ''

                const outputBaseClasses = nodeData.outputs[j].baseClasses ?? []
                if (outputBaseClasses.length > 1) {
                    baseClasses = outputBaseClasses.join('|')
                    type = outputBaseClasses.join(' | ')
                } else if (outputBaseClasses.length === 1) {
                    baseClasses = outputBaseClasses[0]
                    type = outputBaseClasses[0]
                }

                const newOutputOption = {
                    id: `${newNodeId}-output-${nodeData.outputs[j].name}-${baseClasses}`,
                    name: nodeData.outputs[j].name,
                    label: nodeData.outputs[j].label,
                    type
                }
                options.push(newOutputOption)
            }
            const newOutput = {
                name: 'output',
                label: 'Output',
                type: 'options',
                options,
                default: nodeData.outputs[0].name
            }
            outputAnchors.push(newOutput)
        } else {
            const newOutput = {
                id: `${newNodeId}-output-${nodeData.name}-${nodeData.baseClasses.join('|')}`,
                name: nodeData.name,
                label: nodeData.type,
                type: nodeData.baseClasses.join(' | ')
            }
            outputAnchors.push(newOutput)
        }
    }

    /* Initial
    inputs = [
        {
            label: 'field_label_1',
            name: 'string'
        },
        {
            label: 'field_label_2',
            name: 'CustomType'
        }
    ]

    =>  Convert to inputs, inputParams, inputAnchors

    =>  inputs = { 'field': 'defaultvalue' } // Turn into inputs object with default values
    
    =>  // For inputs that are part of whitelistTypes
        inputParams = [
            {
                label: 'field_label_1',
                name: 'string'
            }
        ]

    =>  // For inputs that are not part of whitelistTypes
        inputAnchors = [
            {
                label: 'field_label_2',
                name: 'CustomType'
            }
        ]
    */

    // Inputs
    if (nodeData.inputs) {
        nodeData.inputAnchors = inputAnchors
        nodeData.inputParams = inputParams
        nodeData.inputs = initializeDefaultNodeData(nodeData.inputs)
    } else {
        nodeData.inputAnchors = []
        nodeData.inputParams = []
        nodeData.inputs = {}
    }

    // Outputs
    if (nodeData.outputs) {
        nodeData.outputs = initializeDefaultNodeData(outputAnchors)
    } else {
        nodeData.outputs = {}
    }
    nodeData.outputAnchors = outputAnchors

    // Credential
    if (nodeData.credential) nodeData.credential = ''

    nodeData.id = newNodeId

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

    let sourceTypes = sourceHandle.split('-')[sourceHandle.split('-').length - 1].split('|')
    sourceTypes = sourceTypes.map((s) => s.trim())
    let targetTypes = targetHandle.split('-')[targetHandle.split('-').length - 1].split('|')
    targetTypes = targetTypes.map((t) => t.trim())

    if (targetTypes.some((t) => sourceTypes.includes(t))) {
        let targetNode = reactFlowInstance.getNode(target)

        if (!targetNode) {
            if (!reactFlowInstance.getEdges().find((e) => e.targetHandle === targetHandle)) {
                return true
            }
        } else {
            const targetNodeInputAnchor =
                targetNode.data.inputAnchors.find((ancr) => ancr.id === targetHandle) ||
                targetNode.data.inputParams.find((ancr) => ancr.id === targetHandle)
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
    let fileNames = []
    if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
        const files = JSON.parse(fileBase64)
        for (const file of files) {
            const splitDataURI = file.split(',')
            const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
            fileNames.push(filename)
        }
        return fileNames.join(', ')
    } else {
        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
        return filename
    }
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
            version: node.data.version,
            name: node.data.name,
            type: node.data.type,
            baseClasses: node.data.baseClasses,
            category: node.data.category,
            description: node.data.description,
            inputParams: node.data.inputParams,
            inputAnchors: node.data.inputAnchors,
            inputs: {},
            outputAnchors: node.data.outputAnchors,
            outputs: node.data.outputs,
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

export const getAvailableNodesForVariable = (nodes, edges, target, targetHandle) => {
    // example edge id = "llmChain_0-llmChain_0-output-outputPrediction-string|json-llmChain_1-llmChain_1-input-promptValues-string"
    //                    {source}  -{sourceHandle}                           -{target}  -{targetHandle}
    const parentNodes = []
    const inputEdges = edges.filter((edg) => edg.target === target && edg.targetHandle === targetHandle)
    if (inputEdges && inputEdges.length) {
        for (let j = 0; j < inputEdges.length; j += 1) {
            const node = nodes.find((nd) => nd.id === inputEdges[j].source)
            parentNodes.push(node)
        }
    }
    return parentNodes
}

export const rearrangeToolsOrdering = (newValues, sourceNodeId) => {
    // RequestsGet and RequestsPost have to be in order before other tools
    newValues.push(`{{${sourceNodeId}.data.instance}}`)

    const sortKey = (item) => {
        if (item.includes('requestsGet') || item.includes('readFile')) {
            return 0
        } else if (item.includes('requestsPost') || item.includes('writeFile')) {
            return 1
        } else {
            return 2
        }
    }

    newValues.sort((a, b) => sortKey(a) - sortKey(b))
}

export const throttle = (func, limit) => {
    let lastFunc
    let lastRan

    return (...args) => {
        if (!lastRan) {
            func(...args)
            lastRan = Date.now()
        } else {
            clearTimeout(lastFunc)
            lastFunc = setTimeout(() => {
                if (Date.now() - lastRan >= limit) {
                    func(...args)
                    lastRan = Date.now()
                }
            }, limit - (Date.now() - lastRan))
        }
    }
}

export const generateRandomGradient = () => {
    function randomColor() {
        var color = 'rgb('
        for (var i = 0; i < 3; i++) {
            var random = Math.floor(Math.random() * 256)
            color += random
            if (i < 2) {
                color += ','
            }
        }
        color += ')'
        return color
    }

    var gradient = 'linear-gradient(' + randomColor() + ', ' + randomColor() + ')'

    return gradient
}

export const getInputVariables = (paramValue) => {
    let returnVal = paramValue
    const variableStack = []
    const inputVariables = []
    let startIdx = 0
    const endIdx = returnVal.length

    while (startIdx < endIdx) {
        const substr = returnVal.substring(startIdx, startIdx + 1)

        // Store the opening double curly bracket
        if (substr === '{') {
            variableStack.push({ substr, startIdx: startIdx + 1 })
        }

        // Found the complete variable
        if (substr === '}' && variableStack.length > 0 && variableStack[variableStack.length - 1].substr === '{') {
            const variableStartIdx = variableStack[variableStack.length - 1].startIdx
            const variableEndIdx = startIdx
            const variableFullPath = returnVal.substring(variableStartIdx, variableEndIdx)
            inputVariables.push(variableFullPath)
            variableStack.pop()
        }
        startIdx += 1
    }
    return inputVariables
}

export const isValidURL = (url) => {
    try {
        return new URL(url)
    } catch (err) {
        return undefined
    }
}
