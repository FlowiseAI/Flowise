import axios from 'axios'
import { load } from 'cheerio'
import * as fs from 'fs'
import * as path from 'path'
import { JSDOM } from 'jsdom'
import { DataSource } from 'typeorm'
import { ICommonObject, IDatabaseEntity, IMessage, INodeData } from './Interface'
import { AES, enc } from 'crypto-js'
import { ChatMessageHistory } from 'langchain/memory'
import { AIMessage, HumanMessage } from 'langchain/schema'

export const numberOrExpressionRegex = '^(\\d+\\.?\\d*|{{.*}})$' //return true if string consists only numbers OR expression {{}}
export const notEmptyRegex = '(.|\\s)*\\S(.|\\s)*' //return true if string is not empty or blank

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
        if (linkElement.href.slice(0, 1) === '/') {
            try {
                const urlObj = new URL(baseURL + linkElement.href)
                urls.push(urlObj.href) //relative
            } catch (err) {
                if (process.env.DEBUG === 'true') console.error(`error with relative url: ${err.message}`)
                continue
            }
        } else {
            try {
                const urlObj = new URL(linkElement.href)
                urls.push(urlObj.href) //absolute
            } catch (err) {
                if (process.env.DEBUG === 'true') console.error(`error with absolute url: ${err.message}`)
                continue
            }
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
    const hostPath = urlObj.hostname + urlObj.pathname
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
        const nextURLs = getURLsFromHTML(htmlBody, baseURL)
        for (const nextURL of nextURLs) {
            pages = await crawl(baseURL, nextURL, pages, limit)
        }
    } catch (err) {
        if (process.env.DEBUG === 'true') console.error(`error in fetch url: ${err.message}, on page: ${currentURL}`)
    }
    return pages
}

/**
 * Prep URL before passing into recursive carwl function
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
        path.join(__dirname, '..', '..', '..', '..', '..', 'server', 'encryption.key')
    ]
    for (const checkPath of checkPaths) {
        if (fs.existsSync(checkPath)) {
            return checkPath
        }
    }
    return ''
}

const getEncryptionKeyPath = (): string => {
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

        // Decrpyt credentialData
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
 * Map incoming chat history to ChatMessageHistory
 * @param {options} ICommonObject
 * @returns {ChatMessageHistory}
 */
export const mapChatHistory = (options: ICommonObject): ChatMessageHistory => {
    const chatHistory = []
    const histories: IMessage[] = options.chatHistory ?? []

    for (const message of histories) {
        if (message.type === 'apiMessage') {
            chatHistory.push(new AIMessage(message.message))
        } else if (message.type === 'userMessage') {
            chatHistory.push(new HumanMessage(message.message))
        }
    }
    return new ChatMessageHistory(chatHistory)
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
