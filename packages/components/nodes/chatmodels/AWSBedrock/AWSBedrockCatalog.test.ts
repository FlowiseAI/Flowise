import * as fs from 'fs'
import * as path from 'path'

describe('AWS Bedrock model catalog (models.json)', () => {
    let bedrockChat: any

    beforeAll(() => {
        const modelsPath = path.join(__dirname, '..', '..', '..', 'models.json')
        const raw = JSON.parse(fs.readFileSync(modelsPath, 'utf8'))
        bedrockChat = raw.chat.find((c: any) => c.name === 'awsChatBedrock')
    })

    it('awsChatBedrock section exists', () => {
        expect(bedrockChat).toBeDefined()
    })

    it('has a non-empty models array', () => {
        expect(bedrockChat.models.length).toBeGreaterThan(0)
    })

    it('has a non-empty regions array', () => {
        expect(bedrockChat.regions.length).toBeGreaterThan(0)
    })

    it('every model has label and name', () => {
        for (const m of bedrockChat.models) {
            expect(m.label).toBeTruthy()
            expect(m.name).toBeTruthy()
        }
    })

    it('does not contain TwelveLabs Pegasus (not a chat model)', () => {
        const pegasus = bedrockChat.models.find((m: any) => m.name.includes('twelvelabs.pegasus'))
        expect(pegasus).toBeUndefined()
    })

    it('contains models added from AWS API', () => {
        const names = bedrockChat.models.map((m: any) => m.name)
        expect(names).toContain('minimax.minimax-m2.5')
        expect(names).toContain('nvidia.nemotron-super-3-120b')
        expect(names).toContain('zai.glm-5')
        expect(names).toContain('writer.palmyra-vision-7b')
    })

    it('legacy models are present with (Legacy) label', () => {
        const legacyModels = bedrockChat.models.filter((m: any) => m.label.includes('(Legacy)'))
        expect(legacyModels.length).toBeGreaterThan(0)

        const legacyNames = legacyModels.map((m: any) => m.name)
        expect(legacyNames).toContain('anthropic.claude-3-haiku-20240307-v1:0')
        expect(legacyNames).toContain('meta.llama3-2-1b-instruct-v1:0')
        expect(legacyNames).toContain('cohere.command-r-v1:0')

        for (const m of legacyModels) {
            expect(m.label).toContain('(Legacy)')
            expect(m.description).toMatch(/Legacy|deprecated/i)
        }
    })

    it('does not contain stale/wrong model IDs', () => {
        const names = bedrockChat.models.map((m: any) => m.name)
        expect(names).not.toContain('deepseek.v3-v1:0')
        expect(names).not.toContain('meta.llama3-1-405b-instruct-v1:0')
        expect(names).not.toContain('mistral.mistral-large-2407-v1:0')
        expect(names).not.toContain('nvidia.nemotron-3-super-120b-a12b')
        expect(names).not.toContain('qwen.qwen3-235b-a22b-2507-v1:0')
        expect(names).not.toContain('qwen.qwen3-coder-480b-a35b-v1:0')
    })

    it('contains Claude 4.6 Sonnet (auto-converted via code)', () => {
        const claude46 = bedrockChat.models.find((m: any) => m.name === 'anthropic.claude-sonnet-4-6')
        expect(claude46).toBeDefined()
    })

    it('model names do not have leading/trailing whitespace', () => {
        for (const m of bedrockChat.models) {
            expect(m.name).toBe(m.name.trim())
        }
    })

    it('marks correct models with stop_sequences: false', () => {
        const noStopSeq = bedrockChat.models.filter((m: any) => m.stop_sequences === false).map((m: any) => m.name)
        expect(noStopSeq).toContain('deepseek.v3.2')
        expect(noStopSeq).toContain('deepseek.r1-v1:0')
        expect(noStopSeq).toContain('openai.gpt-oss-20b-1:0')
        expect(noStopSeq).toContain('openai.gpt-oss-120b-1:0')
        expect(noStopSeq).toContain('openai.gpt-oss-safeguard-20b')
        expect(noStopSeq).toContain('openai.gpt-oss-safeguard-120b')
        expect(noStopSeq).toHaveLength(6)
    })

    it('does not mark other models with stop_sequences: false', () => {
        const withStopSeq = bedrockChat.models.filter((m: any) => m.stop_sequences === false)
        const names = withStopSeq.map((m: any) => m.name)
        expect(names).not.toContain('anthropic.claude-sonnet-4-6')
        expect(names).not.toContain('amazon.nova-pro-v1:0')
    })

    // --- Pricing ---

    it('every model has input_cost and output_cost', () => {
        for (const m of bedrockChat.models) {
            expect(m.input_cost).toBeDefined()
            expect(m.output_cost).toBeDefined()
            expect(typeof m.input_cost).toBe('number')
            expect(typeof m.output_cost).toBe('number')
            expect(m.input_cost).toBeGreaterThan(0)
            expect(m.output_cost).toBeGreaterThan(0)
        }
    })
})
