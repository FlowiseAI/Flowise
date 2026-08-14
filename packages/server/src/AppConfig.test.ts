import { afterEach, describe, expect, it, jest } from '@jest/globals'

const ORIGINAL_ENV = process.env

describe('AppConfig', () => {
    afterEach(() => {
        process.env = ORIGINAL_ENV
        jest.resetModules()
    })

    it('treats whitespace-padded true values as enabled', async () => {
        process.env = { ...ORIGINAL_ENV, SHOW_COMMUNITY_NODES: ' true ' }

        const { appConfig } = await import('./AppConfig')

        expect(appConfig.showCommunityNodes).toBe(true)
    })

    it('keeps whitespace-padded false values disabled', async () => {
        process.env = { ...ORIGINAL_ENV, SHOW_COMMUNITY_NODES: ' false ' }

        const { appConfig } = await import('./AppConfig')

        expect(appConfig.showCommunityNodes).toBe(false)
    })

    it('defaults to disabled when the env var is unset', async () => {
        process.env = { ...ORIGINAL_ENV }
        delete process.env.SHOW_COMMUNITY_NODES

        const { appConfig } = await import('./AppConfig')

        expect(appConfig.showCommunityNodes).toBe(false)
    })
})
