import CryptoJS from 'crypto-js'

export interface IApiClientCredentials {
    userid: string
    mandator: string
    baseUrl: string
    providerId: string
    privateKey: string
}

export interface IKCCategoryMetadata {
    catBranch: string
}

export interface IKCCategory {
    id: string
    parentId: string
    label: string
    metadata: IKCCategoryMetadata
    childs: IKCCategory[]
}

export interface IKCDocCategory {
    branch: string
    branchText: string
    id: string
    superId: string
    name: string
    level: number
    rank: number
    isHome: boolean
}

export interface IKCDocument {
    id: string
    doctypeguid: string
    guid: string
    title: string
    summary: string
    content: string
    categories: IKCDocCategory[]
}

const servicePath: string = '/serviceconnector/services/rest'

export class KCenterApiClient {
    credentials: IApiClientCredentials

    constructor(p_credentials: IApiClientCredentials) {
        this.credentials = p_credentials
    }

    private async fetchDocument(guid: string, lang: string, cookieJar: any): Promise<IKCDocument> {
        try {
            const encodedGuid = encodeURIComponent(guid)
            const encodedLang = encodeURIComponent(lang)
            const encodedMandator = encodeURIComponent(this.credentials.mandator)

            const docUrl = `${this.credentials.baseUrl}${servicePath}/documents/${encodedGuid}?lang=${encodedLang}&additionalData=true&mandator=${encodedMandator}`
            if (process.env.DEBUG === 'true') console.info('Try to fetch document with url: ' + docUrl)

            const cookies = cookieJar['cookies'] ? cookieJar['cookies'].join('; ') : ''

            const res = await fetch(docUrl, {
                headers: { Cookie: cookies }
            })

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}, message: ${res.statusText}`)
            }

            if (process.env.DEBUG === 'true') console.info('Document fetched')
            let data = await res.json()

            if (Array.isArray(data)) {
                if (data.length > 0) {
                    data = data[0]
                } else {
                    throw new Error('No document data received (empty array)')
                }
            }

            if (data === null) {
                throw new Error('No document data received (null)')
            }

            if (process.env.DEBUG === 'true') console.info('[FetcDocument]: ', data)

            return data as IKCDocument
        } catch (error) {
            console.warn('Error: ', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Failed to fetch document (guid: ${guid}): ${errorMessage}`)
        }
    }

    private async fetchDocumentsFromCategory(
        categoryBranch: string,
        lang: string,
        recursive: boolean,
        cookieJar: any
    ): Promise<IKCDocument[]> {
        throw new Error(`Not implemented`)
    }

    private async fetchCategory(id: string, lang: string, maxLevel: number, cookieJar: any): Promise<IKCCategory> {
        try {
            const encodedId = encodeURIComponent(id)
            const encodedLang = encodeURIComponent(lang)
            const encodedMandator = encodeURIComponent(this.credentials.mandator)

            const encodedMaxLevelParam = maxLevel ? '&maxLevel=' + encodeURIComponent(maxLevel) : ''

            const catUrl = `${this.credentials.baseUrl}${servicePath}/content/categories/${encodedId}?lang=${encodedLang}&mandator=${encodedMandator}${encodedMaxLevelParam}`
            if (process.env.DEBUG === 'true') console.info('Try to fetch category with url: ' + catUrl)

            const cookies = cookieJar['cookies'] ? cookieJar['cookies'].join('; ') : ''

            const res = await fetch(catUrl, {
                headers: { Cookie: cookies }
            })

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}, message: ${res.statusText}`)
            }

            if (process.env.DEBUG === 'true') console.info('Category fetched')
            let data = await res.json()

            if (data === null) {
                throw new Error('No category data received (null)')
            }

            if (process.env.DEBUG === 'true') console.info('[FetcCategory]: ', data)

            return data as IKCCategory
        } catch (error) {
            console.warn('Error: ', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Failed to fetch category (id: ${id}): ${errorMessage}`)
        }
    }

    private base64url(source: CryptoJS.lib.WordArray): string {
        // Encode in classical base64
        let encodedSource = CryptoJS.enc.Base64.stringify(source)

        // Remove padding equal characters
        encodedSource = encodedSource.replace(/=+$/, '')

        // Replace characters according to base64url specifications
        encodedSource = encodedSource.replace(/\+/g, '-')
        encodedSource = encodedSource.replace(/\//g, '_')

        return encodedSource
    }

    private createEternalToken(): string {
        const currentTimeInSec: number = Math.floor(Date.now() / 1000)
        const expiresInMinutes: number = 5
        const uuid = 'FWKC:' + CryptoJS.lib.WordArray.random(16).toString()

        const header = { alg: 'HS256', typ: 'JWT' }
        const data = {
            jti: uuid,
            sub: this.credentials.userid,
            iat: currentTimeInSec,
            exp: currentTimeInSec + expiresInMinutes * 60,
            iss: 'Flowise', //irgendwie die domain bestimmen
            mandator: this.credentials.mandator
        }

        const stringifiedHeader = CryptoJS.enc.Utf8.parse(JSON.stringify(header))
        const encodedHeader = this.base64url(stringifiedHeader)

        const stringifiedData = CryptoJS.enc.Utf8.parse(JSON.stringify(data))
        const encodedData = this.base64url(stringifiedData)

        const token = encodedHeader + '.' + encodedData

        const signatureData = CryptoJS.HmacSHA256(token, this.credentials.privateKey)
        const signature = this.base64url(signatureData)

        const signedToken = token + '.' + signature

        return signedToken
    }

    private async login(cookieJar: any): Promise<boolean> {
        try {
            const providerId = this.credentials.providerId ? this.credentials.providerId : 'jwt-eternal'
            const encodedProviderId = encodeURIComponent(providerId)

            let encodedToken
            if (providerId.startsWith('jwt-')) {
                encodedToken = encodeURIComponent(this.createEternalToken())
            } else {
                // TODO: create jwt token
                //encodedToken = encodeURIComponent(this.createJwtToken());
                console.error('Only JWT-Token providers are supported jet: ' + providerId)
            }

            const encodedMandator = encodeURIComponent(this.credentials?.mandator)

            const loginUrl = `${this.credentials.baseUrl}/serviceconnector/services/rest/auth/login?gk_token=${encodedToken}&gk_providerid=${encodedProviderId}&mandator=${encodedMandator}`

            if (process.env.DEBUG === 'true') console.info('Try to login: ' + loginUrl)

            const res = await fetch(loginUrl)
            if (res.ok) {
                //const data = await res.json();
                //console.log(data);

                cookieJar['cookies'] = []

                for (const header of res.headers.entries()) {
                    if (process.env.DEBUG === 'true') console.info('Handler cookie: ', header)
                    if (header[0] === 'set-cookie') {
                        cookieJar['cookies'].push(header[1].split(';')[0])
                    }
                }
                if (process.env.DEBUG === 'true') console.info(`Cookies in jar: ${cookieJar['cookies']}`)

                return true
            } else {
                console.error(`Did not get an OK from the server. Code: ${res.status}, Msg: ${res.statusText}`)
            }
        } catch (error) {
            console.error('Error: ', error)
        }

        return false
    }

    private async logout(cookieJar: any) {
        try {
            const logoutUrl = `${this.credentials.baseUrl}/serviceconnector/services/rest/auth/logout`
            if (process.env.DEBUG === 'true') console.info('Try to logout: ' + logoutUrl)

            const cookies = cookieJar['cookies'] ? cookieJar['cookies'].join('; ') : ''

            const res = await fetch(logoutUrl, {
                headers: { Cookie: cookies }
            })

            if (res.ok) {
                if (process.env.DEBUG === 'true') console.info(`[Logout]: Got an OK from the server.`)
            } else {
                console.error(`[Logout]: Did not get an OK from the server. Code: ${res.status}, Msg: ${res.statusText}`)
            }
        } catch (error) {
            console.error('Error: ', error)
        }
    }

    async loadDocument(docGuid: string, lang: string): Promise<IKCDocument> {
        const cookieJar = {}

        try {
            const loginSuccess = await this.login(cookieJar)

            if (!loginSuccess) {
                throw new Error('Could not login!')
            }

            const docData = await this.fetchDocument(docGuid, lang, cookieJar)

            if (process.env.DEBUG === 'true') console.info('Fetched docData: ', docData)

            return docData
        } catch (error) {
            console.warn('Error: ', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Failed to load document (guid: ${docGuid}): ${errorMessage}`)
        } finally {
            try {
                await this.logout(cookieJar)
            } catch (error) {
                console.warn('Could not logout: ', error instanceof Error ? error.message : error)
            }
        }
    }

    async loadDocumentsFromCategory(categoryBranch: string, lang: string, recursive: boolean): Promise<IKCDocument[]> {
        const cookieJar = {}

        try {
            const loginSuccess = await this.login(cookieJar)

            if (!loginSuccess) {
                throw new Error('Could not login!')
            }

            const docData = await this.fetchDocumentsFromCategory(categoryBranch, lang, recursive, cookieJar)

            if (process.env.DEBUG === 'true') console.info('Fetched docData: ', docData)

            return docData
        } catch (error) {
            console.warn('Error: ', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Failed to load documents from category (guid: ${categoryBranch}): ${errorMessage}`)
        } finally {
            try {
                await this.logout(cookieJar)
            } catch (error) {
                console.warn('Could not logout: ', error instanceof Error ? error.message : error)
            }
        }
    }

    async loadCategory(catId: string, lang: string, maxLevel: number): Promise<IKCCategory> {
        const cookieJar = {}

        try {
            const loginSuccess = await this.login(cookieJar)

            if (!loginSuccess) {
                throw new Error('Could not login!')
            }
            const maxDeep = maxLevel < 0 ? 0 : maxLevel
            const catData = await this.fetchCategory(catId, lang, maxDeep, cookieJar)

            if (process.env.DEBUG === 'true') console.info('Fetched catData: ', catData)

            return catData
        } catch (error) {
            console.warn('Error: ', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Failed to load category (guid: ${catId}): ${errorMessage}`)
        } finally {
            try {
                await this.logout(cookieJar)
            } catch (error) {
                console.warn('Could not logout: ', error instanceof Error ? error.message : error)
            }
        }
    }
}
