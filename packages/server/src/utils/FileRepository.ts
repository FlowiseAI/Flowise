import { ChatFlow } from '../database/entities/ChatFlow'
import path from 'path'
import { getStoragePath } from 'flowise-components'
import fs from 'fs'

export const containsBase64File = (chatflow: ChatFlow) => {
    const data = JSON.parse(chatflow.flowData)
    const re = new RegExp('^data.*;base64', 'i')
    let found = false
    data.nodes.map((node: any) => {
        const inputs = node.data.inputs
        if (inputs) {
            const keys = Object.getOwnPropertyNames(inputs)
            for (let i = 0; i < keys.length; i++) {
                const input = inputs[keys[i]]
                if (typeof input !== 'string') {
                    continue
                }
                if (input.startsWith('[')) {
                    const files = JSON.parse(input)
                    for (let j = 0; j < files.length; j++) {
                        const file = files[j]
                        if (re.test(file)) {
                            found = true
                            break
                        }
                    }
                }
                if (re.test(input)) {
                    found = true
                    break
                }
            }
        }
    })
    return found
}

function addFileToStorage(file: string, chatflowid: string, fileNames: string[], inputs: any, name: string) {
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
    inputs[name] = 'FILE-STORAGE::' + JSON.stringify(fileNames)
}

export const updateFlowDataWithFilePaths = (chatflowid: string, flowData: string) => {
    const data = JSON.parse(flowData)
    const re = new RegExp('^data.*;base64', 'i')
    data.nodes.map((node: any) => {
        const inputs = node.data.inputs
        if (inputs) {
            const keys = Object.getOwnPropertyNames(inputs)
            for (let i = 0; i < keys.length; i++) {
                const fileNames: string[] = []
                const key = keys[i]
                const input = inputs[key]
                if (typeof input !== 'string') {
                    continue
                }
                if (input.startsWith('[')) {
                    const files = JSON.parse(input)
                    for (let j = 0; j < files.length; j++) {
                        const file = files[j]
                        if (re.test(file)) {
                            addFileToStorage(file, chatflowid, fileNames, inputs, key)
                        }
                    }
                } else if (re.test(input)) {
                    addFileToStorage(input, chatflowid, fileNames, inputs, key)
                }
            }
        }
    })
    return JSON.stringify(data)
}
