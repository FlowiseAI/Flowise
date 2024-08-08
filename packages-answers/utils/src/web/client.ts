import axios from 'axios'
import { PuppeteerWebBaseLoader } from 'langchain/document_loaders/web/puppeteer'

import getAxiosErrorMessage from '../utilities/getAxiosErrorMessage'
import prepareHtml from './prepareHtml'

class WebClient {
    headers: { Authorization?: string; Accept: string; Cookie?: string }
    cacheExpireTime: number

    constructor({ cacheExpireTime = 60 * 60 * 24 } = {}) {
        this.cacheExpireTime = cacheExpireTime
        this.headers = {
            Accept: 'text/plain'
        }
    }

    async fetchWebData(url: string, { cache = true }: { cache?: boolean } = {}) {
        let data
        let htmlHasContent = false

        try {
            if (!data) {
                const response = await axios.get(url, {
                    method: 'GET',
                    headers: this.headers
                })

                if (response.status !== 200) {
                    throw new Error(`Response Failed to fetch data from ${url}. Status: ${response.status}`)
                }

                data = response?.data
                htmlHasContent = prepareHtml(url, data, true).trim() !== ''
                if (htmlHasContent) {
                    data = prepareHtml(url, data)
                }
            }
        } catch (error: unknown) {
            let message = getAxiosErrorMessage(error)
            console.log(`Error fetching ${url} via axios.  ${message}`)
            return ''
        }
        if (!htmlHasContent) {
            console.log(`No valid HTML from axios for ${url}.`)
            const puppeteerTimer = `[${new Date().valueOf()}] Pulling ${url} via Puppeteer`

            try {
                console.time(puppeteerTimer)

                const loader = new PuppeteerWebBaseLoader(url, {
                    launchOptions: {
                        headless: 'new',
                        args: [
                            `--host-resovler-rules=MAP * 127.0.0.1, EXCLUDE ${url}`,
                            // '--disable-gpu',
                            // '--disable-dev-shm-usage',
                            // '--single-process',
                            // '--disable-software-rasterizer',
                            // '--disable-background-networking',
                            // '--disable-background-timer-throttling',
                            // '--disable-backgrounding-occluded-windows',
                            // '--disable-breakpad',
                            // '--disable-client-side-phishing-detection',
                            // '--disable-default-apps',
                            // '--disable-extensions',
                            // '--disable-hang-monitor',
                            // '--disable-popup-blocking',
                            // '--disable-infobars',
                            // '--disable-session-crashed-bubble',
                            // '--disable-translate',
                            // '--disable-web-security',
                            // '--metrics-recording-only',
                            // '--mute-audio',
                            // '--no-default-browser-check',
                            // '--no-first-run',
                            // '--safebrowsing-disable-auto-update',
                            // '--disable-component-update',
                            '--window-size=1,1'
                            // '--ignore-certificate-errors'
                        ],
                        defaultViewport: {
                            width: 1,
                            height: 1
                        }
                    },
                    gotoOptions: {
                        waitUntil: 'networkidle2',
                        timeout: 10000 // 10 Seconds
                    }
                })

                const docs = await loader.load()

                if (!docs.length) {
                    throw new Error('Issue fetching document')
                }

                htmlHasContent = prepareHtml(url, docs[0].pageContent, true).trim() !== ''
                if (htmlHasContent) {
                    data = prepareHtml(url, docs[0].pageContent)
                }
            } catch (error: unknown) {
                let message = getAxiosErrorMessage(error)
                throw new Error(message)
            } finally {
                console.timeEnd(puppeteerTimer)
            }
        }

        try {
            if (!htmlHasContent) {
                throw new Error(`Issue fetching ${url} using both axios and Puppeteer`)
            }
        } catch (error: unknown) {
            let message = getAxiosErrorMessage(error)
            throw new Error(message)
        }

        return data
    }
}

export default WebClient
