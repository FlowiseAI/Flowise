import { INodeParams, INodeCredential } from '../src/Interface'

class ChatYandexGPTCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Учетные данные для YandexGPT'
        this.name = 'chatYandexGPT'
        this.version = 1.0
        this.description = '<a target="_blank" href="https://cloud.yandex.ru/ru/docs">Документация</a> сервисов Yandex.'
        this.inputs = [
            {
                label: 'YandexGPT iamToken',
                name: 'chatYandexGptIamToken',
                type: 'string',
                placeholder: 'Мои данные YandexGPT',
                optional: true,
                description:
                    '<a target="_blank" href="https://cloud.yandex.ru/ru/docs/iam/operations/iam-token/create">Документация</a> получения iam токена.'
            },
            {
                label: 'YandexGPT ID папки',
                name: 'chatYandexGptFolderID',
                type: 'string',
                placeholder: 'folderID'
            },
            {
                label: 'YandexGPT URI модели',
                name: 'chatYandexGptModelURI',
                type: 'string',
                placeholder: 'modelURI'
            },
            {
                label: 'YandexGPT API key',
                name: 'chatYandexGptApiKey',
                type: 'string',
                placeholder: 'API key'
            },
            {
                label: 'YandexGPT Версия модели',
                name: 'chatYandexGptModelVersion',
                type: 'string',
                optional: true,
                placeholder: 'modelVersion'
            }
        ]
    }
}

module.exports = { credClass: ChatYandexGPTCredential }
