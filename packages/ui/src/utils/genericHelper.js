import { uniq } from 'lodash'
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
        'folder',
        'tabs',
        'conditionFunction' // This is a special type for condition functions
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
        if (nodeData.hideOutput) continue
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
                    description: nodeData.outputs[j].description ?? '',
                    type,
                    isAnchor: nodeData.outputs[j]?.isAnchor,
                    hidden: nodeData.outputs[j]?.hidden
                }
                options.push(newOutputOption)
            }
            const newOutput = {
                name: 'output',
                label: 'Output',
                type: 'options',
                description: nodeData.outputs[0].description ?? '',
                options,
                default: nodeData.outputs[0].name
            }
            outputAnchors.push(newOutput)
        } else {
            const newOutput = {
                id: `${newNodeId}-output-${nodeData.name}-${nodeData.baseClasses.join('|')}`,
                name: nodeData.name,
                label: nodeData.type,
                description: nodeData.description ?? '',
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

export const updateOutdatedNodeData = (newComponentNodeData, existingComponentNodeData) => {
    const initNewComponentNodeData = initNode(newComponentNodeData, existingComponentNodeData.id)

    // Update credentials with existing credentials
    if (existingComponentNodeData.credential) {
        initNewComponentNodeData.credential = existingComponentNodeData.credential
    }

    // Update inputs with existing inputs
    if (existingComponentNodeData.inputs) {
        for (const key in existingComponentNodeData.inputs) {
            if (key in initNewComponentNodeData.inputs) {
                initNewComponentNodeData.inputs[key] = existingComponentNodeData.inputs[key]
            }
        }
    }
    // Check for tabs
    const inputParamsWithTabIdentifiers = initNewComponentNodeData.inputParams.filter((param) => param.tabIdentifier) || []

    for (const inputParam of inputParamsWithTabIdentifiers) {
        const tabIdentifier = `${inputParam.tabIdentifier}_${existingComponentNodeData.id}`
        let selectedTabValue = existingComponentNodeData.inputs[tabIdentifier] || inputParam.default
        initNewComponentNodeData.inputs[tabIdentifier] = selectedTabValue
        initNewComponentNodeData.inputs[selectedTabValue] = existingComponentNodeData.inputs[selectedTabValue]
    }

    // Update outputs with existing outputs
    if (existingComponentNodeData.outputs) {
        for (const key in existingComponentNodeData.outputs) {
            if (key in initNewComponentNodeData.outputs) {
                initNewComponentNodeData.outputs[key] = existingComponentNodeData.outputs[key]
            }
        }
    }

    // Special case for Condition node to update outputAnchors
    if (initNewComponentNodeData.name.includes('seqCondition')) {
        const options = existingComponentNodeData.outputAnchors[0].options || []

        const newOptions = []
        for (let i = 0; i < options.length; i += 1) {
            if (options[i].isAnchor) {
                newOptions.push({
                    ...options[i],
                    id: `${initNewComponentNodeData.id}-output-${options[i].name}-Condition`,
                    type: 'Condition'
                })
            }
        }

        initNewComponentNodeData.outputAnchors[0].options = newOptions
    }

    return initNewComponentNodeData
}

export const updateOutdatedNodeEdge = (newComponentNodeData, edges) => {
    const removedEdges = []
    for (const edge of edges) {
        const targetNodeId = edge.targetHandle.split('-')[0]
        const sourceNodeId = edge.sourceHandle.split('-')[0]

        if (targetNodeId === newComponentNodeData.id) {
            // Check if targetHandle is in inputParams or inputAnchors
            const inputParam = newComponentNodeData.inputParams.find((param) => param.id === edge.targetHandle)
            const inputAnchor = newComponentNodeData.inputAnchors.find((param) => param.id === edge.targetHandle)

            if (!inputParam && !inputAnchor) {
                removedEdges.push(edge)
            }
        }

        if (sourceNodeId === newComponentNodeData.id) {
            if (newComponentNodeData.outputAnchors?.length) {
                for (const outputAnchor of newComponentNodeData.outputAnchors) {
                    const outputAnchorType = outputAnchor.type
                    if (outputAnchorType === 'options') {
                        if (!outputAnchor.options.find((outputOption) => outputOption.id === edge.sourceHandle)) {
                            removedEdges.push(edge)
                        }
                    } else {
                        if (outputAnchor.id !== edge.sourceHandle) {
                            removedEdges.push(edge)
                        }
                    }
                }
            }
        }
    }

    return removedEdges
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
    if (fileBase64.startsWith('FILE-STORAGE::')) {
        const names = fileBase64.substring(14)
        if (names.includes('[') && names.includes(']')) {
            const files = JSON.parse(names)
            return files.join(', ')
        } else {
            return fileBase64.substring(14)
        }
    }
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
            tags: node.data.tags,
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

    const isSeqAgent = nodes.find((nd) => nd.id === target)?.data?.category === 'Sequential Agents'

    function collectParentNodes(targetNodeId, nodes, edges) {
        const inputEdges = edges.filter(
            (edg) => edg.target === targetNodeId && edg.targetHandle.includes(`${targetNodeId}-input-sequentialNode`)
        )

        // Traverse each edge found
        inputEdges.forEach((edge) => {
            const parentNode = nodes.find((nd) => nd.id === edge.source)
            if (!parentNode) return

            // Recursive call to explore further up the tree
            collectParentNodes(parentNode.id, nodes, edges)

            // Check and add the parent node to the list if it does not include specific names
            const excludeNodeNames = ['seqAgent', 'seqLLMNode', 'seqToolNode']
            if (excludeNodeNames.includes(parentNode.data.name)) {
                parentNodes.push(parentNode)
            }
        })
    }

    if (isSeqAgent) {
        collectParentNodes(target, nodes, edges)
        return uniq(parentNodes)
    } else {
        const inputEdges = edges.filter((edg) => edg.target === target && edg.targetHandle === targetHandle)
        if (inputEdges && inputEdges.length) {
            for (let j = 0; j < inputEdges.length; j += 1) {
                const node = nodes.find((nd) => nd.id === inputEdges[j].source)
                parentNodes.push(node)
            }
        }
        return parentNodes
    }
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

                if (vsNode.data.inputs.recordManager) {
                    const recordManagerId = vsNode.data.inputs.recordManager.replace(/{{|}}/g, '').split('.')[0]
                    innerNodes.push(nodes.find((node) => node.data.id === recordManagerId))
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
        if (source && source.metadata && source.metadata.source) {
            if (isValidURL(source.metadata.source) && !visitedURLs.includes(source.metadata.source)) {
                visitedURLs.push(source.metadata.source)
                newSourceDocuments.push(source)
            } else if (!isValidURL(source.metadata.source)) {
                newSourceDocuments.push(source)
            }
        } else if (source) {
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

export const setLocalStorageChatflow = (chatflowid, chatId, saveObj = {}) => {
    const chatDetails = localStorage.getItem(`${chatflowid}_INTERNAL`)
    const obj = { ...saveObj }
    if (chatId) obj.chatId = chatId

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

export const getLocalStorageChatflow = (chatflowid) => {
    const chatDetails = localStorage.getItem(`${chatflowid}_INTERNAL`)
    if (!chatDetails) return {}
    try {
        return JSON.parse(chatDetails)
    } catch (e) {
        return {}
    }
}

export const removeLocalStorageChatHistory = (chatflowid) => {
    const chatDetails = localStorage.getItem(`${chatflowid}_INTERNAL`)
    if (!chatDetails) return
    try {
        const parsedChatDetails = JSON.parse(chatDetails)
        if (parsedChatDetails.lead) {
            // Dont remove lead when chat is cleared
            const obj = { lead: parsedChatDetails.lead }
            localStorage.removeItem(`${chatflowid}_INTERNAL`)
            localStorage.setItem(`${chatflowid}_INTERNAL`, JSON.stringify(obj))
        } else {
            localStorage.removeItem(`${chatflowid}_INTERNAL`)
        }
    } catch (e) {
        return
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
        let exampleVal = `"example"`
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

export const getOS = () => {
    let userAgent = window.navigator.userAgent.toLowerCase(),
        macosPlatforms = /(macintosh|macintel|macppc|mac68k|macos)/i,
        windowsPlatforms = /(win32|win64|windows|wince)/i,
        iosPlatforms = /(iphone|ipad|ipod)/i,
        os = null

    if (macosPlatforms.test(userAgent)) {
        os = 'macos'
    } else if (iosPlatforms.test(userAgent)) {
        os = 'ios'
    } else if (windowsPlatforms.test(userAgent)) {
        os = 'windows'
    } else if (/android/.test(userAgent)) {
        os = 'android'
    } else if (!os && /linux/.test(userAgent)) {
        os = 'linux'
    }

    return os
}

export const formatBytes = (number) => {
    if (number == null || number === undefined || number <= 0) {
        return '0 Bytes'
    }
    var scaleCounter = 0
    var scaleInitials = [' Bytes', ' KB', ' MB', ' GB', ' TB', ' PB', ' EB', ' ZB', ' YB']
    while (number >= 1024 && scaleCounter < scaleInitials.length - 1) {
        number /= 1024
        scaleCounter++
    }
    if (scaleCounter >= scaleInitials.length) scaleCounter = scaleInitials.length - 1
    let compactNumber = number
        .toFixed(2)
        .replace(/\.?0+$/, '')
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    compactNumber += scaleInitials[scaleCounter]
    return compactNumber.trim()
}

// Formatter from: https://stackoverflow.com/a/9462382
export const kFormatter = (num) => {
    const lookup = [
        { value: 1, symbol: '' },
        { value: 1e3, symbol: 'k' },
        { value: 1e6, symbol: 'M' },
        { value: 1e9, symbol: 'G' },
        { value: 1e12, symbol: 'T' },
        { value: 1e15, symbol: 'P' },
        { value: 1e18, symbol: 'E' }
    ]
    const regexp = /\.0+$|(?<=\.[0-9]*[1-9])0+$/
    const item = lookup.findLast((item) => num >= item.value)
    return item ? (num / item.value).toFixed(1).replace(regexp, '').concat(item.symbol) : '0'
}

const toCamelCase = (str) => {
    return str
        .split(' ') // Split by space to process each word
        .map((word, index) => (index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
        .join('') // Join the words back into a single string
}

const createJsonArray = (labels) => {
    return labels.map((label) => {
        return {
            label: label,
            name: toCamelCase(label),
            baseClasses: ['Condition'],
            isAnchor: true
        }
    })
}

export const getCustomConditionOutputs = (value, nodeId, existingEdges, isDataGrid) => {
    // Regex to find return statements and capture returned values
    const regex = /return\s+(['"`])(.*?)\1/g
    let match
    const numberOfReturns = []

    if (!isDataGrid) {
        // Loop over the matches of the regex
        while ((match = regex.exec(value)) !== null) {
            // Push the captured group, which is the actual return value, into results
            numberOfReturns.push(match[2])
        }
    } else {
        try {
            const parsedValue = JSON.parse(value)
            if (parsedValue && parsedValue.length) {
                for (const item of parsedValue) {
                    if (!item.variable) {
                        alert('Please specify a Variable. Try connecting Condition node to a previous node and select the variable')
                        return undefined
                    }
                    if (!item.output) {
                        alert('Please specify an Output Name')
                        return undefined
                    }
                    if (!item.operation) {
                        alert('Please select an operation for the condition')
                        return undefined
                    }
                    numberOfReturns.push(item.output)
                }
                numberOfReturns.push('End')
            }
        } catch (e) {
            console.error('Error parsing JSON', e)
        }
    }

    if (numberOfReturns.length === 0) {
        if (isDataGrid) alert('Please add an item for the condition')
        else
            alert(
                'Please add a return statement in the condition code to define the output. You can refer to How to Use for more information.'
            )
        return undefined
    }

    const outputs = createJsonArray(numberOfReturns.sort())

    const outputAnchors = []

    const options = []
    for (let j = 0; j < outputs.length; j += 1) {
        let baseClasses = ''
        let type = ''

        const outputBaseClasses = outputs[j].baseClasses ?? []
        if (outputBaseClasses.length > 1) {
            baseClasses = outputBaseClasses.join('|')
            type = outputBaseClasses.join(' | ')
        } else if (outputBaseClasses.length === 1) {
            baseClasses = outputBaseClasses[0]
            type = outputBaseClasses[0]
        }

        const newOutputOption = {
            id: `${nodeId}-output-${outputs[j].name}-${baseClasses}`,
            name: outputs[j].name,
            label: outputs[j].label,
            type,
            isAnchor: outputs[j]?.isAnchor
        }
        options.push(newOutputOption)
    }
    const newOutput = {
        name: 'output',
        label: 'Output',
        type: 'options',
        options
    }
    outputAnchors.push(newOutput)

    // Remove edges
    let newEdgeSourceHandles = []
    for (const anchor of options) {
        const anchorId = anchor.id
        newEdgeSourceHandles.push(anchorId)
    }

    const toBeRemovedEdgeIds = existingEdges.filter((edge) => !newEdgeSourceHandles.includes(edge.sourceHandle)).map((edge) => edge.id)

    return { outputAnchors, toBeRemovedEdgeIds }
}

export const getBasename = () => {
    try {
        const baseTag = document.querySelector('base')
        let baseHref = baseTag ? baseTag.getAttribute('href') || '/' : '/'
        if (baseHref === '%BASE_HREF%') {
            baseHref = '/'
        }
        if (baseHref.endsWith('/')) {
            baseHref = baseHref.slice(0, -1)
        }
        return baseHref
    } catch (error) {
        throw new Error(`basenameHelper.getBasename ${getErrorMessage(error)}`)
    }
}
