import fs from 'fs'
import path from 'path'

describe('CustomMCP flow variable substitution', () => {
    test('compiled CustomMCP supports $flow in sandbox substitution', () => {
        const distPath = path.resolve(__dirname, '../../dist/nodes/tools/MCP/CustomMCP/CustomMCP.js')
        const contents = fs.readFileSync(distPath, 'utf8')

        expect(contents).toContain("'$flow'")
        expect(contents).toContain('sessionId')
        expect(contents).toContain('chatId')
    })
})
