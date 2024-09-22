import axios from 'axios'
import { load } from 'cheerio'
import * as fs from 'fs'
import * as path from 'path'
import { JSDOM } from 'jsdom'
import { z } from 'zod'
import { DataSource } from 'typeorm'
import { ICommonObject, IDatabaseEntity, IMessage, INodeData, IVariable, MessageContentImageUrl } from './Interface'
import { AES, enc } from 'crypto-js'
import { AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages'
import { getFileFromStorage } from './storageUtils'

export const numberOrExpressionRegex = '^(\\d+\\.?\\d*|{{.*}})$' //return true if string consists only numbers OR expression {{}}
export const notEmptyRegex = '(.|\\s)*\\S(.|\\s)*' //return true if string is not empty or blank
export const FLOWISE_CHATID = 'flowise_chatId'

/*
 * List of dependencies allowed to be import in @flowiseai/nodevm
 */
export const availableDependencies = [
    '@aws-sdk/client-bedrock-runtime',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-s3',
    '@elastic/elasticsearch',
    '@dqbd/tiktoken',
    '@getzep/zep-js',
    '@gomomento/sdk',
    '@gomomento/sdk-core',
    '@google-ai/generativelanguage',
    '@google/generative-ai',
    '@huggingface/inference',
    '@langchain/anthropic',
    '@langchain/aws',
    '@langchain/cohere',
    '@langchain/community',
    '@langchain/core',
    '@langchain/google-genai',
    '@langchain/google-vertexai',
    '@langchain/groq',
    '@langchain/langgraph',
    '@langchain/mistralai',
    '@langchain/mongodb',
    '@langchain/ollama',
    '@langchain/openai',
    '@langchain/pinecone',
    '@langchain/qdrant',
    '@langchain/weaviate',
    '@notionhq/client',
    '@opensearch-project/opensearch',
    '@pinecone-database/pinecone',
    '@qdrant/js-client-rest',
    '@supabase/supabase-js',
    '@upstash/redis',
    '@zilliz/milvus2-sdk-node',
    'apify-client',
    'axios',
    'cheerio',
    'chromadb',
    'cohere-ai',
    'd3-dsv',
    'faiss-node',
    'form-data',
    'google-auth-library',
    'graphql',
    'html-to-text',
    'ioredis',
    'langchain',
    'langfuse',
    'langsmith',
    'langwatch',
    'linkifyjs',
    'lunary',
    'mammoth',
    'moment',
    'mongodb',
    'mysql2',
    'node-fetch',
    'node-html-markdown',
    'notion-to-md',
    'openai',
    'pdf-parse',
    'pdfjs-dist',
    'pg',
    'playwright',
    'puppeteer',
    'redis',
    'replicate',
    'srt-parser-2',
    'typeorm',
    'weaviate-ts-client'
]

export const defaultAllowBuiltInDep = [
    'assert',
    'buffer',
    'crypto',
    'events',
    'http',
    'https',
    'net',
    'path',
    'querystring',
    'timers',
    'tls',
    'url',
    'zlib'
]

/**
 * Get base classes of components
 *
 * @export
 * @param {any} targetClass
 * @returns {string[]}
 */
export const getBaseClasses = (targetClass: any) => {
    const baseClasses: string[] = []
    const skipClassNames = ['BaseLangChain', 'Serializable']

    if (targetClass instanceof Function) {
        let baseClass = targetClass

        while (baseClass) {
            const newBaseClass = Object.getPrototypeOf(baseClass)
            if (newBaseClass && newBaseClass !== Object && newBaseClass.name) {
                baseClass = newBaseClass
                if (!skipClassNames.includes(baseClass.name)) baseClasses.push(baseClass.name)
            } else {
                break
            }
        }
    }
    return baseClasses
}

/**
 * Serialize axios query params
 *
 * @export
 * @param {any} params
 * @param {boolean} skipIndex // Set to true if you want same params to be: param=1&param=2 instead of: param[0]=1&param[1]=2
 * @returns {string}
 */
export function serializeQueryParams(params: any, skipIndex?: boolean): string {
    const parts: any[] = []

    const encode = (val: string) => {
        return encodeURIComponent(val)
            .replace(/%3A/gi, ':')
            .replace(/%24/g, '$')
            .replace(/%2C/gi, ',')
            .replace(/%20/g, '+')
            .replace(/%5B/gi, '[')
            .replace(/%5D/gi, ']')
    }

    const convertPart = (key: string, val: any) => {
        if (val instanceof Date) val = val.toISOString()
        else if (val instanceof Object) val = JSON.stringify(val)

        parts.push(encode(key) + '=' + encode(val))
    }

    Object.entries(params).forEach(([key, val]) => {
        if (val === null || typeof val === 'undefined') return

        if (Array.isArray(val)) val.forEach((v, i) => convertPart(`${key}${skipIndex ? '' : `[${i}]`}`, v))
        else convertPart(key, val)
    })

    return parts.join('&')
}

/**
 * Handle error from try catch
 *
 * @export
 * @param {any} error
 * @returns {string}
 */
export function handleErrorMessage(error: any): string {
    let errorMessage = ''

    if (error.message) {
        errorMessage += error.message + '. '
    }

    if (error.response && error.response.data) {
        if (error.response.data.error) {
            if (typeof error.response.data.error === 'object') errorMessage += JSON.stringify(error.response.data.error) + '. '
            else if (typeof error.response.data.error === 'string') errorMessage += error.response.data.error + '. '
        } else if (error.response.data.msg) errorMessage += error.response.data.msg + '. '
        else if (error.response.data.Message) errorMessage += error.response.data.Message + '. '
        else if (typeof error.response.data === 'string') errorMessage += error.response.data + '. '
    }

    if (!errorMessage) errorMessage = 'Unexpected Error.'

    return errorMessage
}

/**
 * Returns the path of node modules package
 * @param {string} packageName
 * @returns {string}
 */
export const getNodeModulesPackagePath = (packageName: string): string => {
    const checkPaths = [
        path.join(__dirname, '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', '..', '..', 'node_modules', packageName),
        path.join(__dirname, '..', '..', '..', '..', '..', 'node_modules', packageName)
    ]
    for (const checkPath of checkPaths) {
        if (fs.existsSync(checkPath)) {
            return checkPath
        }
    }
    return ''
}

/**
 * Get input variables
 * @param {string} paramValue
 * @returns {boolean}
 */
export const getInputVariables = (paramValue: string): string[] => {
    if (typeof paramValue !== 'string') return []
    const returnVal = paramValue
    const variableStack = []
    const inputVariables = []
    let startIdx = 0
    const endIdx = returnVal.length
    while (startIdx < endIdx) {
        const substr = returnVal.substring(startIdx, startIdx + 1)
        // Check for escaped curly brackets
        if (substr === '\\' && (returnVal[startIdx + 1] === '{' || returnVal[startIdx + 1] === '}')) {
            startIdx += 2 // Skip the escaped bracket
            continue
        }
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

/**
 * Crawl all available urls given a domain url and limit
 * @param {string} url
 * @param {number} limit
 * @returns {string[]}
 */
export const getAvailableURLs = async (url: string, limit: number) => {
    try {
        const availableUrls: string[] = []

        console.info(`Crawling: ${url}`)
        availableUrls.push(url)

        const response = await axios.get(url)
        const $ = load(response.data)

        const relativeLinks = $("a[href^='/']")
        console.info(`Available Relative Links: ${relativeLinks.length}`)
        if (relativeLinks.length === 0) return availableUrls

        limit = Math.min(limit + 1, relativeLinks.length) // limit + 1 is because index start from 0 and index 0 is occupy by url
        console.info(`True Limit: ${limit}`)

        // availableUrls.length cannot exceed limit
        for (let i = 0; availableUrls.length < limit; i++) {
            if (i === limit) break // some links are repetitive so it won't added into the array which cause the length to be lesser
            console.info(`index: ${i}`)
            const element = relativeLinks[i]

            const relativeUrl = $(element).attr('href')
            if (!relativeUrl) continue

            const absoluteUrl = new URL(relativeUrl, url).toString()
            if (!availableUrls.includes(absoluteUrl)) {
                availableUrls.push(absoluteUrl)
                console.info(`Found unique relative link: ${absoluteUrl}`)
            }
        }

        return availableUrls
    } catch (err) {
        throw new Error(`getAvailableURLs: ${err?.message}`)
    }
}

/**
 * Search for href through htmlBody string
 * @param {string} htmlBody
 * @param {string} baseURL
 * @returns {string[]}
 */
function getURLsFromHTML(htmlBody: string, baseURL: string): string[] {
    const dom = new JSDOM(htmlBody)
    const linkElements = dom.window.document.querySelectorAll('a')
    const urls: string[] = []
    for (const linkElement of linkElements) {
        try {
            const urlObj = new URL(linkElement.href, baseURL)
            urls.push(urlObj.href)
        } catch (err) {
            if (process.env.DEBUG === 'true') console.error(`error with scraped URL: ${err.message}`)
            continue
        }
    }
    return urls
}

/**
 * Normalize URL to prevent crawling the same page
 * @param {string} urlString
 * @returns {string}
 */
function normalizeURL(urlString: string): string {
    const urlObj = new URL(urlString)
    const hostPath = urlObj.hostname + urlObj.pathname + urlObj.search
    if (hostPath.length > 0 && hostPath.slice(-1) == '/') {
        // handling trailing slash
        return hostPath.slice(0, -1)
    }
    return hostPath
}

/**
 * Recursive crawl using normalizeURL and getURLsFromHTML
 * @param {string} baseURL
 * @param {string} currentURL
 * @param {string[]} pages
 * @param {number} limit
 * @returns {Promise<string[]>}
 */
async function crawl(baseURL: string, currentURL: string, pages: string[], limit: number): Promise<string[]> {
    const baseURLObj = new URL(baseURL)
    const currentURLObj = new URL(currentURL)

    if (limit !== 0 && pages.length === limit) return pages

    if (baseURLObj.hostname !== currentURLObj.hostname) return pages

    const normalizeCurrentURL = baseURLObj.protocol + '//' + normalizeURL(currentURL)
    if (pages.includes(normalizeCurrentURL)) {
        return pages
    }

    pages.push(normalizeCurrentURL)

    if (process.env.DEBUG === 'true') console.info(`actively crawling ${currentURL}`)
    try {
        const resp = await fetch(currentURL)

        if (resp.status > 399) {
            if (process.env.DEBUG === 'true') console.error(`error in fetch with status code: ${resp.status}, on page: ${currentURL}`)
            return pages
        }

        const contentType: string | null = resp.headers.get('content-type')
        if ((contentType && !contentType.includes('text/html')) || !contentType) {
            if (process.env.DEBUG === 'true') console.error(`non html response, content type: ${contentType}, on page: ${currentURL}`)
            return pages
        }

        const htmlBody = await resp.text()
        const nextURLs = getURLsFromHTML(htmlBody, currentURL)
        for (const nextURL of nextURLs) {
            pages = await crawl(baseURL, nextURL, pages, limit)
        }
    } catch (err) {
        if (process.env.DEBUG === 'true') console.error(`error in fetch url: ${err.message}, on page: ${currentURL}`)
    }
    return pages
}

/**
 * Prep URL before passing into recursive crawl function
 * @param {string} stringURL
 * @param {number} limit
 * @returns {Promise<string[]>}
 */
export async function webCrawl(stringURL: string, limit: number): Promise<string[]> {
    const URLObj = new URL(stringURL)
    const modifyURL = stringURL.slice(-1) === '/' ? stringURL.slice(0, -1) : stringURL
    return await crawl(URLObj.protocol + '//' + URLObj.hostname, modifyURL, [], limit)
}

export function getURLsFromXML(xmlBody: string, limit: number): string[] {
    const dom = new JSDOM(xmlBody, { contentType: 'text/xml' })
    const linkElements = dom.window.document.querySelectorAll('url')
    const urls: string[] = []
    for (const linkElement of linkElements) {
        const locElement = linkElement.querySelector('loc')
        if (limit !== 0 && urls.length === limit) break
        if (locElement?.textContent) {
            urls.push(locElement.textContent)
        }
    }
    return urls
}

export async function xmlScrape(currentURL: string, limit: number): Promise<string[]> {
    let urls: string[] = []
    if (process.env.DEBUG === 'true') console.info(`actively scarping ${currentURL}`)
    try {
        const resp = await fetch(currentURL)

        if (resp.status > 399) {
            if (process.env.DEBUG === 'true') console.error(`error in fetch with status code: ${resp.status}, on page: ${currentURL}`)
            return urls
        }

        const contentType: string | null = resp.headers.get('content-type')
        if ((contentType && !contentType.includes('application/xml') && !contentType.includes('text/xml')) || !contentType) {
            if (process.env.DEBUG === 'true') console.error(`non xml response, content type: ${contentType}, on page: ${currentURL}`)
            return urls
        }

        const xmlBody = await resp.text()
        urls = getURLsFromXML(xmlBody, limit)
    } catch (err) {
        if (process.env.DEBUG === 'true') console.error(`error in fetch url: ${err.message}, on page: ${currentURL}`)
    }
    return urls
}

/**
 * Get env variables
 * @param {string} name
 * @returns {string | undefined}
 */
export const getEnvironmentVariable = (name: string): string | undefined => {
    try {
        return typeof process !== 'undefined' ? process.env?.[name] : undefined
    } catch (e) {
        return undefined
    }
}

/**
 * Returns the path of encryption key
 * @returns {string}
 */
const getEncryptionKeyFilePath = (): string => {
    const checkPaths = [
        path.join(__dirname, '..', '..', 'encryption.key'),
        path.join(__dirname, '..', '..', 'server', 'encryption.key'),
        path.join(__dirname, '..', '..', '..', 'encryption.key'),
        path.join(__dirname, '..', '..', '..', 'server', 'encryption.key'),
        path.join(__dirname, '..', '..', '..', '..', 'encryption.key'),
        path.join(__dirname, '..', '..', '..', '..', 'server', 'encryption.key'),
        path.join(__dirname, '..', '..', '..', '..', '..', 'encryption.key'),
        path.join(__dirname, '..', '..', '..', '..', '..', 'server', 'encryption.key'),
        path.join(getUserHome(), '.flowise', 'encryption.key')
    ]
    for (const checkPath of checkPaths) {
        if (fs.existsSync(checkPath)) {
            return checkPath
        }
    }
    return ''
}

export const getEncryptionKeyPath = (): string => {
    return process.env.SECRETKEY_PATH ? path.join(process.env.SECRETKEY_PATH, 'encryption.key') : getEncryptionKeyFilePath()
}

/**
 * Returns the encryption key
 * @returns {Promise<string>}
 */
const getEncryptionKey = async (): Promise<string> => {
    if (process.env.FLOWISE_SECRETKEY_OVERWRITE !== undefined && process.env.FLOWISE_SECRETKEY_OVERWRITE !== '') {
        return process.env.FLOWISE_SECRETKEY_OVERWRITE
    }
    try {
        return await fs.promises.readFile(getEncryptionKeyPath(), 'utf8')
    } catch (error) {
        throw new Error(error)
    }
}

/**
 * Decrypt credential data
 * @param {string} encryptedData
 * @param {string} componentCredentialName
 * @param {IComponentCredentials} componentCredentials
 * @returns {Promise<ICommonObject>}
 */
const decryptCredentialData = async (encryptedData: string): Promise<ICommonObject> => {
    const encryptKey = await getEncryptionKey()
    const decryptedData = AES.decrypt(encryptedData, encryptKey)
    try {
        return JSON.parse(decryptedData.toString(enc.Utf8))
    } catch (e) {
        console.error(e)
        throw new Error('Credentials could not be decrypted.')
    }
}

/**
 * Get credential data
 * @param {string} selectedCredentialId
 * @param {ICommonObject} options
 * @returns {Promise<ICommonObject>}
 */
export const getCredentialData = async (selectedCredentialId: string, options: ICommonObject): Promise<ICommonObject> => {
    const appDataSource = options.appDataSource as DataSource
    const databaseEntities = options.databaseEntities as IDatabaseEntity

    try {
        if (!selectedCredentialId) {
            return {}
        }

        const credential = await appDataSource.getRepository(databaseEntities['Credential']).findOneBy({
            id: selectedCredentialId
        })

        if (!credential) return {}

        // Decrypt credentialData
        const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)

        return decryptedCredentialData
    } catch (e) {
        throw new Error(e)
    }
}

export const getCredentialParam = (paramName: string, credentialData: ICommonObject, nodeData: INodeData): any => {
    return (nodeData.inputs as ICommonObject)[paramName] ?? credentialData[paramName] ?? undefined
}

// reference https://www.freeformatter.com/json-escape.html
const jsonEscapeCharacters = [
    { escape: '"', value: 'FLOWISE_DOUBLE_QUOTE' },
    { escape: '\n', value: 'FLOWISE_NEWLINE' },
    { escape: '\b', value: 'FLOWISE_BACKSPACE' },
    { escape: '\f', value: 'FLOWISE_FORM_FEED' },
    { escape: '\r', value: 'FLOWISE_CARRIAGE_RETURN' },
    { escape: '\t', value: 'FLOWISE_TAB' },
    { escape: '\\', value: 'FLOWISE_BACKSLASH' }
]

function handleEscapesJSONParse(input: string, reverse: Boolean): string {
    for (const element of jsonEscapeCharacters) {
        input = reverse ? input.replaceAll(element.value, element.escape) : input.replaceAll(element.escape, element.value)
    }
    return input
}

function iterateEscapesJSONParse(input: any, reverse: Boolean): any {
    for (const element in input) {
        const type = typeof input[element]
        if (type === 'string') input[element] = handleEscapesJSONParse(input[element], reverse)
        else if (type === 'object') input[element] = iterateEscapesJSONParse(input[element], reverse)
    }
    return input
}

export function handleEscapeCharacters(input: any, reverse: Boolean): any {
    const type = typeof input
    if (type === 'string') return handleEscapesJSONParse(input, reverse)
    else if (type === 'object') return iterateEscapesJSONParse(input, reverse)
    return input
}

/**
 * Get user home dir
 * @returns {string}
 */
export const getUserHome = (): string => {
    let variableName = 'HOME'
    if (process.platform === 'win32') {
        variableName = 'USERPROFILE'
    }

    if (process.env[variableName] === undefined) {
        // If for some reason the variable does not exist, fall back to current folder
        return process.cwd()
    }
    return process.env[variableName] as string
}

/**
 * Map ChatMessage to BaseMessage
 * @param {IChatMessage[]} chatmessages
 * @returns {BaseMessage[]}
 */
export const mapChatMessageToBaseMessage = async (chatmessages: any[] = []): Promise<BaseMessage[]> => {
    const chatHistory = []

    for (const message of chatmessages) {
        if (message.role === 'apiMessage' || message.type === 'apiMessage') {
            chatHistory.push(new AIMessage(message.content || ''))
        } else if (message.role === 'userMessage' || message.role === 'userMessage') {
            // check for image uploads
            if (message.fileUploads) {
                // example: [{"type":"stored-file","name":"0_DiXc4ZklSTo3M8J4.jpg","mime":"image/jpeg"}]
                try {
                    const uploads = JSON.parse(message.fileUploads)
                    const imageContents: MessageContentImageUrl[] = []
                    for (const upload of uploads) {
                        if (upload.type === 'stored-file' && upload.mime.startsWith('image')) {
                            const fileData = await getFileFromStorage(upload.name, message.chatflowid, message.chatId)
                            // as the image is stored in the server, read the file and convert it to base64
                            const bf = 'data:' + upload.mime + ';base64,' + fileData.toString('base64')

                            imageContents.push({
                                type: 'image_url',
                                image_url: {
                                    url: bf
                                }
                            })
                        } else if (upload.type === 'url' && upload.mime.startsWith('image')) {
                            imageContents.push({
                                type: 'image_url',
                                image_url: {
                                    url: upload.data
                                }
                            })
                        }
                    }
                    chatHistory.push(
                        new HumanMessage({
                            content: [
                                {
                                    type: 'text',
                                    text: message.content
                                },
                                ...imageContents
                            ]
                        })
                    )
                } catch (e) {
                    // failed to parse fileUploads, continue with text only
                    chatHistory.push(new HumanMessage(message.content || ''))
                }
            } else {
                chatHistory.push(new HumanMessage(message.content || ''))
            }
        }
    }
    return chatHistory
}

/**
 * Convert incoming chat history to string
 * @param {IMessage[]} chatHistory
 * @returns {string}
 */
export const convertChatHistoryToText = (chatHistory: IMessage[] = []): string => {
    return chatHistory
        .map((chatMessage) => {
            if (chatMessage.type === 'apiMessage') {
                return `Assistant: ${chatMessage.message}`
            } else if (chatMessage.type === 'userMessage') {
                return `Human: ${chatMessage.message}`
            } else {
                return `${chatMessage.message}`
            }
        })
        .join('\n')
}

/**
 * Serialize array chat history to string
 * @param {string | Array<string>} chatHistory
 * @returns {string}
 */
export const serializeChatHistory = (chatHistory: string | Array<string>) => {
    if (Array.isArray(chatHistory)) {
        return chatHistory.join('\n')
    }
    return chatHistory
}

/**
 * Convert schema to zod schema
 * @param {string | object} schema
 * @returns {ICommonObject}
 */
export const convertSchemaToZod = (schema: string | object): ICommonObject => {
    try {
        const parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema
        const zodObj: ICommonObject = {}
        for (const sch of parsedSchema) {
            if (sch.type === 'string') {
                if (sch.required) z.string({ required_error: `${sch.property} required` }).describe(sch.description)
                zodObj[sch.property] = z.string().describe(sch.description)
            } else if (sch.type === 'number') {
                if (sch.required) z.number({ required_error: `${sch.property} required` }).describe(sch.description)
                zodObj[sch.property] = z.number().describe(sch.description)
            } else if (sch.type === 'boolean') {
                if (sch.required) z.boolean({ required_error: `${sch.property} required` }).describe(sch.description)
                zodObj[sch.property] = z.boolean().describe(sch.description)
            }
        }
        return zodObj
    } catch (e) {
        throw new Error(e)
    }
}

/**
 * Flatten nested object
 * @param {ICommonObject} obj
 * @param {string} parentKey
 * @returns {ICommonObject}
 */
export const flattenObject = (obj: ICommonObject, parentKey?: string) => {
    let result: any = {}

    if (!obj) return result

    Object.keys(obj).forEach((key) => {
        const value = obj[key]
        const _key = parentKey ? parentKey + '.' + key : key
        if (typeof value === 'object') {
            result = { ...result, ...flattenObject(value, _key) }
        } else {
            result[_key] = value
        }
    })

    return result
}

/**
 * Convert BaseMessage to IMessage
 * @param {BaseMessage[]} messages
 * @returns {IMessage[]}
 */
export const convertBaseMessagetoIMessage = (messages: BaseMessage[]): IMessage[] => {
    const formatmessages: IMessage[] = []
    for (const m of messages) {
        if (m._getType() === 'human') {
            formatmessages.push({
                message: m.content as string,
                type: 'userMessage'
            })
        } else if (m._getType() === 'ai') {
            formatmessages.push({
                message: m.content as string,
                type: 'apiMessage'
            })
        } else if (m._getType() === 'system') {
            formatmessages.push({
                message: m.content as string,
                type: 'apiMessage'
            })
        }
    }
    return formatmessages
}

/**
 * Convert MultiOptions String to String Array
 * @param {string} inputString
 * @returns {string[]}
 */
export const convertMultiOptionsToStringArray = (inputString: string): string[] => {
    let ArrayString: string[] = []
    try {
        ArrayString = JSON.parse(inputString)
    } catch (e) {
        ArrayString = []
    }
    return ArrayString
}

/**
 * Get variables
 * @param {DataSource} appDataSource
 * @param {IDatabaseEntity} databaseEntities
 * @param {INodeData} nodeData
 */
export const getVars = async (appDataSource: DataSource, databaseEntities: IDatabaseEntity, nodeData: INodeData) => {
    const variables = ((await appDataSource.getRepository(databaseEntities['Variable']).find()) as IVariable[]) ?? []

    // override variables defined in overrideConfig
    // nodeData.inputs.vars is an Object, check each property and override the variable
    if (nodeData?.inputs?.vars) {
        for (const propertyName of Object.getOwnPropertyNames(nodeData.inputs.vars)) {
            const foundVar = variables.find((v) => v.name === propertyName)
            if (foundVar) {
                // even if the variable was defined as runtime, we override it with static value
                foundVar.type = 'static'
                foundVar.value = nodeData.inputs.vars[propertyName]
            } else {
                // add it the variables, if not found locally in the db
                variables.push({ name: propertyName, type: 'static', value: nodeData.inputs.vars[propertyName] })
            }
        }
    }

    return variables
}

/**
 * Prepare sandbox variables
 * @param {IVariable[]} variables
 */
export const prepareSandboxVars = (variables: IVariable[]) => {
    let vars = {}
    if (variables) {
        for (const item of variables) {
            let value = item.value

            // read from .env file
            if (item.type === 'runtime') {
                value = process.env[item.name] ?? ''
            }

            Object.defineProperty(vars, item.name, {
                enumerable: true,
                configurable: true,
                writable: true,
                value: value
            })
        }
    }
    return vars
}

let version: string
export const getVersion: () => Promise<{ version: string }> = async () => {
    if (version != null) return { version }

    const checkPaths = [
        path.join(__dirname, '..', 'package.json'),
        path.join(__dirname, '..', '..', 'package.json'),
        path.join(__dirname, '..', '..', '..', 'package.json'),
        path.join(__dirname, '..', '..', '..', '..', 'package.json'),
        path.join(__dirname, '..', '..', '..', '..', '..', 'package.json')
    ]
    for (const checkPath of checkPaths) {
        try {
            const content = await fs.promises.readFile(checkPath, 'utf8')
            const parsedContent = JSON.parse(content)
            version = parsedContent.version
            return { version }
        } catch {
            continue
        }
    }

    throw new Error('None of the package.json paths could be parsed')
}

/**
 * Map MimeType to InputField
 * @param {string} mimeType
 * @returns {string}
 */
export const mapMimeTypeToInputField = (mimeType: string) => {
    switch (mimeType) {
        case 'text/plain':
            return 'txtFile'
        case 'application/pdf':
            return 'pdfFile'
        case 'application/json':
            return 'jsonFile'
        case 'text/csv':
            return 'csvFile'
        case 'application/json-lines':
        case 'application/jsonl':
        case 'text/jsonl':
            return 'jsonlinesFile'
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return 'docxFile'
        case 'application/vnd.yaml':
        case 'application/x-yaml':
        case 'text/vnd.yaml':
        case 'text/x-yaml':
        case 'text/yaml':
            return 'yamlFile'
        default:
            return 'txtFile'
    }
}

/**
 * Map MimeType to Extension
 * @param {string} mimeType
 * @returns {string}
 */
export const mapMimeTypeToExt = (mimeType: string) => {
    switch (mimeType) {
        case 'text/plain':
            return 'txt'
        case 'application/pdf':
            return 'pdf'
        case 'application/json':
            return 'json'
        case 'text/csv':
            return 'csv'
        case 'application/json-lines':
        case 'application/jsonl':
        case 'text/jsonl':
            return 'jsonl'
        case 'application/msword':
            return 'doc'
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return 'docx'
        case 'application/vnd.ms-excel':
            return 'xls'
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            return 'xlsx'
        default:
            return ''
    }
}

// remove invalid markdown image pattern: ![<some-string>](<some-string>)
export const removeInvalidImageMarkdown = (output: string): string => {
    return typeof output === 'string' ? output.replace(/!\[.*?\]\((?!https?:\/\/).*?\)/g, '') : output
}
