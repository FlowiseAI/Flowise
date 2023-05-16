import { Document } from 'langchain/document'
import type { CheerioAPI } from 'cheerio'
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'
import type { DocumentLoader } from 'langchain/document_loaders'

export class DingDocLoader extends CheerioWebBaseLoader implements DocumentLoader {
    constructor(public webPath: string) {
        super(webPath)
    }

    static async _scrape(url: string): Promise<CheerioAPI> {
        const { load } = await DingDocLoader.imports()
        const finalUrl = url.replace(
            /open.dingtalk.com\/document\/(.*)\/(.*)/,
            (s, s1, s2) => `icms-document.oss-cn-beijing.aliyuncs.com/zh-CN/dingtalk/${s1}/topics/${s2}.html`
        )
        // @ts-ignore
        const response = await fetch(finalUrl)

        const html = await response.text()

        return load(html)
    }

    async scrape(): Promise<CheerioAPI> {
        return DingDocLoader._scrape(this.webPath)
    }

    async load(): Promise<Document[]> {
        const $ = await this.scrape()
        const title = $('h1.title').text()
        const date = $('meta[name="gmtModify"]')?.attr('content')?.replace('更新于 ', '')
        const content = $('body').html()
        const cleanedContent = content!
        const contentLength = cleanedContent.length ?? 0

        const metadata = { source: this.webPath, title, date, contentLength }

        return [new Document({ pageContent: cleanedContent, metadata })]
    }
}
