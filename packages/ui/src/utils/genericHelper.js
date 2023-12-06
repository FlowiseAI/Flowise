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
        'datagrid',
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

export const getUpsertDetails = (nodes, edges) => {
    const vsNodes = nodes.filter(
        (node) =>
            node.data.category === 'Vector Stores' && !node.data.label.includes('Upsert') && !node.data.label.includes('Load Existing')
    )
    const vsNodeIds = vsNodes.map((vs) => vs.data.id)

    const upsertNodes = []
    const seenVsNodeIds = []
    for (const edge of edges) {
        if (vsNodeIds.includes(edge.source) || vsNodeIds.includes(edge.target)) {
            const vsNode = vsNodes.find((node) => node.data.id === edge.source || node.data.id === edge.target)
            if (!vsNode || seenVsNodeIds.includes(vsNode.data.id)) continue
            seenVsNodeIds.push(vsNode.data.id)

            // Found Vector Store Node, proceed to find connected Document Loader node
            let connectedDocs = []

            if (vsNode.data.inputs.document) connectedDocs = [...new Set(vsNode.data.inputs.document)]

            if (connectedDocs.length) {
                const innerNodes = [vsNode]

                if (vsNode.data.inputs.embeddings) {
                    const embeddingsId = vsNode.data.inputs.embeddings.replace(/{{|}}/g, '').split('.')[0]
                    innerNodes.push(nodes.find((node) => node.data.id === embeddingsId))
                }

                for (const doc of connectedDocs) {
                    const docId = doc.replace(/{{|}}/g, '').split('.')[0]
                    const docNode = nodes.find((node) => node.data.id === docId)
                    if (docNode) innerNodes.push(docNode)

                    // Found Document Loader Node, proceed to find connected Text Splitter node
                    if (docNode && docNode.data.inputs.textSplitter) {
                        const textSplitterId = docNode.data.inputs.textSplitter.replace(/{{|}}/g, '').split('.')[0]
                        const textSplitterNode = nodes.find((node) => node.data.id === textSplitterId)
                        if (textSplitterNode) innerNodes.push(textSplitterNode)
                    }
                }

                upsertNodes.push({
                    vectorNode: vsNode,
                    nodes: innerNodes.reverse()
                })
            }
        }
    }
    return upsertNodes
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

export const removeDuplicateURL = (message) => {
    const visitedURLs = []
    const newSourceDocuments = []

    if (!message.sourceDocuments) return newSourceDocuments

    message.sourceDocuments.forEach((source) => {
        if (source.metadata && source.metadata.source) {
            if (isValidURL(source.metadata.source) && !visitedURLs.includes(source.metadata.source)) {
                visitedURLs.push(source.metadata.source)
                newSourceDocuments.push(source)
            } else if (!isValidURL(source.metadata.source)) {
                newSourceDocuments.push(source)
            }
        } else {
            newSourceDocuments.push(source)
        }
    })
    return newSourceDocuments
}

export const isValidURL = (url) => {
    try {
        return new URL(url)
    } catch (err) {
        return undefined
    }
}

export const formatDataGridRows = (rows) => {
    try {
        const parsedRows = typeof rows === 'string' ? JSON.parse(rows) : rows
        return parsedRows.map((sch, index) => {
            return {
                ...sch,
                id: index
            }
        })
    } catch (e) {
        return []
    }
}

export const setLocalStorageChatflow = (chatflowid, chatId, chatHistory) => {
    const chatDetails = localStorage.getItem(`${chatflowid}_INTERNAL`)
    const obj = {}
    if (chatId) obj.chatId = chatId
    if (chatHistory) obj.chatHistory = chatHistory

    if (!chatDetails) {
        localStorage.setItem(`${chatflowid}_INTERNAL`, JSON.stringify(obj))
    } else {
        try {
            const parsedChatDetails = JSON.parse(chatDetails)
            localStorage.setItem(`${chatflowid}_INTERNAL`, JSON.stringify({ ...parsedChatDetails, ...obj }))
        } catch (e) {
            const chatId = chatDetails
            obj.chatId = chatId
            localStorage.setItem(`${chatflowid}_INTERNAL`, JSON.stringify(obj))
        }
    }
}

export const unshiftFiles = (configData) => {
    const filesConfig = configData.find((config) => config.name === 'files')
    if (filesConfig) {
        configData = configData.filter((config) => config.name !== 'files')
        configData.unshift(filesConfig)
    }
    return configData
}

export const getConfigExamplesForJS = (configData, bodyType, isMultiple, stopNodeId) => {
    let finalStr = ''
    configData = unshiftFiles(configData)
    const loop = Math.min(configData.length, 4)
    for (let i = 0; i < loop; i += 1) {
        const config = configData[i]
        let exampleVal = `"example"`
        if (config.type === 'string') exampleVal = `"example"`
        else if (config.type === 'boolean') exampleVal = `true`
        else if (config.type === 'number') exampleVal = `1`
        else if (config.type === 'json') exampleVal = `{ "key": "val" }`
        else if (config.name === 'files') exampleVal = `input.files[0]`
        finalStr += bodyType === 'json' ? `\n      "${config.name}": ${exampleVal},` : `formData.append("${config.name}", ${exampleVal})\n`
        if (i === loop - 1 && bodyType !== 'json')
            finalStr += !isMultiple
                ? ``
                : stopNodeId
                ? `formData.append("stopNodeId", "${stopNodeId}")\n`
                : `formData.append("question", "Hey, how are you?")\n`
    }
    return finalStr
}

export const getConfigExamplesForPython = (configData, bodyType, isMultiple, stopNodeId) => {
    let finalStr = ''
    configData = unshiftFiles(configData)
    const loop = Math.min(configData.length, 4)
    for (let i = 0; i < loop; i += 1) {
        const config = configData[i]
        let exampleVal = `"example"`
        if (config.type === 'string') exampleVal = `"example"`
        else if (config.type === 'boolean') exampleVal = `true`
        else if (config.type === 'number') exampleVal = `1`
        else if (config.type === 'json') exampleVal = `{ "key": "val" }`
        else if (config.name === 'files') continue
        finalStr += bodyType === 'json' ? `\n        "${config.name}": ${exampleVal},` : `\n    "${config.name}": ${exampleVal},`
        if (i === loop - 1 && bodyType !== 'json')
            finalStr += !isMultiple
                ? `\n`
                : stopNodeId
                ? `\n    "stopNodeId": "${stopNodeId}"\n`
                : `\n    "question": "Hey, how are you?"\n`
    }
    return finalStr
}

export const getConfigExamplesForCurl = (configData, bodyType, isMultiple, stopNodeId) => {
    let finalStr = ''
    configData = unshiftFiles(configData)
    const loop = Math.min(configData.length, 4)
    for (let i = 0; i < loop; i += 1) {
        const config = configData[i]
        let exampleVal = `example`
        if (config.type === 'string') exampleVal = bodyType === 'json' ? `"example"` : `example`
        else if (config.type === 'boolean') exampleVal = `true`
        else if (config.type === 'number') exampleVal = `1`
        else if (config.type === 'json') exampleVal = `{key:val}`
        else if (config.name === 'files')
            exampleVal = `@/home/user1/Desktop/example${config.type.includes(',') ? config.type.split(',')[0] : config.type}`
        finalStr += bodyType === 'json' ? `"${config.name}": ${exampleVal}` : `\n     -F "${config.name}=${exampleVal}"`
        if (i === loop - 1)
            finalStr +=
                bodyType === 'json'
                    ? ` }`
                    : !isMultiple
                    ? ``
                    : stopNodeId
                    ? ` \\\n     -F "stopNodeId=${stopNodeId}"`
                    : ` \\\n     -F "question=Hey, how are you?"`
        else finalStr += bodyType === 'json' ? `, ` : ` \\`
    }
    return finalStr
}
