import { ChatFlow } from '../database/entities/ChatFlow'
import path from 'path'
import { getStoragePath } from 'flowise-components'
import fs from 'fs'
import { IReactFlowObject } from '../Interface'

export const containsBase64File = (chatflow: ChatFlow) => {
    const parsedFlowData: IReactFlowObject = JSON.parse(chatflow.flowData)
    const re = new RegExp('^data.*;base64', 'i')
    let found = false
    const nodes = parsedFlowData.nodes
    for (const node of nodes) {
        if (node.data.category !== 'Document Loaders') {
            continue
        }
        const inputs = node.data.inputs
        if (inputs) {
            const keys = Object.getOwnPropertyNames(inputs)
            for (let i = 0; i < keys.length; i++) {
                const input = inputs[keys[i]]
                if (!input) {
                    continue
                }
                if (typeof input !== 'string') {
                    continue
                }
                if (input.startsWith('[')) {
                    try {
                        const files = JSON.parse(input)
                        for (let j = 0; j < files.length; j++) {
                            const file = files[j]
                            if (re.test(file)) {
                                found = true
                                break
                            }
                        }
                    } catch (e) {
                        continue
                    }
                }
                if (re.test(input)) {
                    found = true
                    break
                }
            }
        }
    }
    return found
}

function addFileToStorage(file: string, chatflowid: string, fileNames: string[]) {
    const dir = path.join(getStoragePath(), chatflowid)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    const splitDataURI = file.split(',')
    const filename = splitDataURI.pop()?.split(':')[1] ?? ''
    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')

    const filePath = path.join(dir, filename)
    fs.writeFileSync(filePath, bf)
    fileNames.push(filename)
    return 'FILE-STORAGE::' + JSON.stringify(fileNames)
}

export const updateFlowDataWithFilePaths = (chatflowid: string, flowData: string) => {
    try {
        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const re = new RegExp('^data.*;base64', 'i')
        const nodes = parsedFlowData.nodes
        for (let j = 0; j < nodes.length; j++) {
            const node = nodes[j]
            if (node.data.category !== 'Document Loaders') {
                continue
            }
            if (node.data.inputs) {
                const inputs = node.data.inputs
                const keys = Object.getOwnPropertyNames(inputs)
                for (let i = 0; i < keys.length; i++) {
                    const fileNames: string[] = []
                    const key = keys[i]
                    const input = inputs?.[key]
                    if (!input) {
                        continue
                    }
                    if (typeof input !== 'string') {
                        continue
                    }
                    if (input.startsWith('[')) {
                        try {
                            const files = JSON.parse(input)
                            for (let j = 0; j < files.length; j++) {
                                const file = files[j]
                                if (re.test(file)) {
                                    node.data.inputs[key] = addFileToStorage(file, chatflowid, fileNames)
                                }
                            }
                        } catch (e) {
                            continue
                        }
                    } else if (re.test(input)) {
                        node.data.inputs[key] = addFileToStorage(input, chatflowid, fileNames)
                    }
                }
            }
        }

        return JSON.stringify(parsedFlowData)
    } catch (e) {
        return ''
    }
}
