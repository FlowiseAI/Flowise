import CryptoJS from 'crypto-js'

export interface IApiClientCredentials {
    userid: string
    mandator: string
    baseUrl: string
    providerId: string
    privateKey: string
}

export interface IKCCategory {
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
    categories: IKCCategory[]
}

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

            const docUrl = `${this.credentials.baseUrl}/serviceconnector/services/rest/documents/${encodedGuid}?lang=${encodedLang}&additionalData=true&mandator=${encodedMandator}`
            console.debug('Try to fetch document with url: ' + docUrl)

            const cookies = cookieJar['cookies'] ? cookieJar['cookies'].join('; ') : ''

            const res = await fetch(docUrl, {
                headers: { Cookie: cookies }
            })

            if (res.ok) {
                console.debug('Document fetched')
                let data = await res.json()

                if (Array.isArray(data)) {
                    if (data.length > 0) {
                        data = data[0]
                    } else {
                        data = null
                    }
                }

                console.debug('[FetcDocument]: ', data)

                return <IKCDocument>data
            } else {
                console.error(`FetchDocument: Did not get an OK from the server. Code: ${res.status}, Msg: ${res.statusText}`)
            }
        } catch (error) {
            console.warn('Error: ', error)
        }

        throw new Error('Could not fetch document!')
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

            console.debug('Try to login: ' + loginUrl)

            const res = await fetch(loginUrl)
            if (res.ok) {
                //const data = await res.json();
                //console.log(data);

                cookieJar['cookies'] = []

                for (const header of res.headers.entries()) {
                    console.debug('Handler cookie: ', header)
                    if (header[0] === 'set-cookie') {
                        cookieJar['cookies'].push(header[1].split(';')[0])
                    }
                }
                console.debug(`Cookies in jar: ${cookieJar['cookies']}`)

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
            console.info('Try to logout: ' + logoutUrl)

            const cookies = cookieJar['cookies'] ? cookieJar['cookies'].join('; ') : ''

            const res = await fetch(logoutUrl, {
                headers: { Cookie: cookies }
            })

            if (res.ok) {
                console.info(`[Logout]: Got an OK from the server.`)
            } else {
                console.error(`[Logout]: Did not get an OK from the server. Code: ${res.status}, Msg: ${res.statusText}`)
            }
        } catch (error) {
            console.log('Error: ', error)
        }
    }

    async loadDocument(docGuid: string, lang: string): Promise<IKCDocument> {
        const cookieJar = {}
        const loginSuccess = await this.login(cookieJar)

        if (!loginSuccess) {
            throw new Error('Could not login!')
        }

        try {
            const docData = this.fetchDocument(docGuid, lang, cookieJar)

            console.debug('Fetched docData: ', docData)

            return docData
        } catch (error) {
            console.warn('Error: ', error)
        } finally {
            try {
                await this.logout(cookieJar)
            } catch (error) {
                console.warn('Could not logout: ', error)
            }
        }

        throw new Error('Could not load document')
    }
}
