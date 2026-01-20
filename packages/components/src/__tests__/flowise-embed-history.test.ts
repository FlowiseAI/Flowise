import fs from 'fs'

const readText = (filePath: string) => fs.readFileSync(filePath, 'utf8')

describe('flowise-embed includeHistory integration', () => {
    test('web.js bundle references includeHistory and public-chatmessage', () => {
        const webJsPath = require.resolve('flowise-embed/dist/web.js')
        const contents = readText(webJsPath)

        expect(contents).toContain('includeHistory')
        expect(contents).toContain('public-chatmessage')
        expect(contents).toContain('sessionId=')
        expect(contents).toContain('chatId=')
    })

    test('web.umd.js bundle references includeHistory and public-chatmessage', () => {
        const webUmdPath = require.resolve('flowise-embed/dist/web.umd.js')
        const contents = readText(webUmdPath)

        expect(contents).toContain('includeHistory')
        expect(contents).toContain('public-chatmessage')
        expect(contents).toContain('sessionId=')
        expect(contents).toContain('chatId=')
    })

    test('web.js bundle persists sessionId when storing history', () => {
        const webJsPath = require.resolve('flowise-embed/dist/web.js')
        const contents = readText(webJsPath)

        expect(contents).toContain('chatHistory:n,sessionId:t')
        expect(contents).toContain('sessionId!==t')
    })

    test('web.umd.js bundle persists sessionId when storing history', () => {
        const webUmdPath = require.resolve('flowise-embed/dist/web.umd.js')
        const contents = readText(webUmdPath)

        expect(contents).toContain('chatHistory:n,sessionId:t')
        expect(contents).toContain('sessionId!==t')
    })

    test('type definitions expose includeHistory on Chatbot init', () => {
        const webDtsPath = require.resolve('flowise-embed/dist/web.d.ts')
        const windowDtsPath = require.resolve('flowise-embed/dist/window.d.ts')
        const botDtsPath = require.resolve('flowise-embed/dist/components/Bot.d.ts')

        expect(readText(webDtsPath)).toContain('includeHistory')
        expect(readText(windowDtsPath)).toContain('includeHistory')
        expect(readText(botDtsPath)).toContain('includeHistory')
    })
})
