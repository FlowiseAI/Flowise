const noop = (..._args: any[]) => undefined

export type IAction = any
export type ICommonObject = Record<string, any>
export type IFileUpload = any
export type IHumanInput = any
export type INode = any
export type INodeData = any
export type INodeExecutionData = any
export type INodeOptionsValue = any
export type INodeParams = any
export type IServerSideEventStreamer = any
export type INodeDataFromComponent = any

export const generateAgentflowv2 = noop
export const getStoragePath = () => ''
export const convertTextToSpeechStream = noop
export const getVoices = async () => []
export const getFilesListFromStorage = async () => []
export const removeSpecificFileFromStorage = noop
export const streamStorageFile = noop
export const addBase64FilesToStorage = async () => ({})
export const webCrawl = async () => ({})
export const xmlScrape = async () => ({})
export const checkDenyList = async () => false
export const getVersion = () => 'test'
export const getFileFromUpload = async () => ({})
export const removeSpecificFileFromUpload = noop
export const removeFolderFromStorage = noop
export const removeFilesFromStorage = noop
export const convertSchemaToZod = noop
export const handleEscapeCharacters = noop
export const getUploadsConfig = noop
export const EvaluationRunner = class {}
export const LLMEvaluationRunner = class {}
export const generateAgentflowv2_json = noop

export default {
    generateAgentflowv2,
    getStoragePath,
    convertTextToSpeechStream,
    getVoices,
    getFilesListFromStorage,
    removeSpecificFileFromStorage,
    streamStorageFile,
    addBase64FilesToStorage,
    webCrawl,
    xmlScrape,
    checkDenyList,
    getVersion,
    getFileFromUpload,
    removeSpecificFileFromUpload,
    removeFolderFromStorage,
    removeFilesFromStorage,
    convertSchemaToZod,
    handleEscapeCharacters,
    getUploadsConfig,
    EvaluationRunner,
    LLMEvaluationRunner,
    generateAgentflowv2_json
}
