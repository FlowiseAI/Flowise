import crypto from 'crypto'
import { TelegramAdapter } from '../../src/channels/adapters/telegram.adapter'
import { WhatsAppAdapter } from '../../src/channels/adapters/whatsapp.adapter'

describe('Channels Adapters', () => {
    describe('TelegramAdapter', () => {
        const adapter = new TelegramAdapter()

        it('parses incoming text message', async () => {
            const payload = {
                update_id: 1,
                message: {
                    message_id: 10,
                    date: 1700000000,
                    text: 'hello',
                    from: { id: 1234 },
                    chat: { id: 5678 }
                }
            }

            const result = await adapter.parseIncomingMessage(
                {
                    headers: {},
                    body: payload
                },
                {
                    chatflowId: 'chatflow',
                    credentialData: { botToken: 'token' }
                }
            )

            expect(result?.provider).toBe('telegram')
            expect(result?.externalUserId).toBe('1234')
            expect(result?.text).toBe('hello')
            expect(result?.metadata?.telegramChatId).toBe(5678)
        })
    })

    describe('WhatsAppAdapter', () => {
        const adapter = new WhatsAppAdapter()

        it('verifies meta signature and parses incoming message', async () => {
            const payload = {
                object: 'whatsapp_business_account',
                entry: [
                    {
                        changes: [
                            {
                                field: 'messages',
                                value: {
                                    metadata: { phone_number_id: '111' },
                                    messages: [
                                        {
                                            id: 'wamid-1',
                                            from: '15551234567',
                                            timestamp: '1700000000',
                                            type: 'text',
                                            text: { body: 'hello from wa' }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }

            const rawBody = JSON.stringify(payload)
            const appSecret = 'my-app-secret'
            const signature = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`

            await adapter.verifyRequest(
                {
                    headers: {
                        'x-hub-signature-256': signature
                    },
                    body: payload,
                    rawBody
                },
                {
                    chatflowId: 'chatflow',
                    credentialData: {
                        accessToken: 'access-token',
                        appSecret,
                        verifyToken: 'verify-token'
                    },
                    accountConfig: {
                        phoneNumberId: '111'
                    }
                }
            )

            const result = await adapter.parseIncomingMessage(
                {
                    headers: {},
                    body: payload,
                    rawBody
                },
                {
                    chatflowId: 'chatflow',
                    credentialData: {
                        accessToken: 'access-token',
                        appSecret,
                        verifyToken: 'verify-token'
                    },
                    accountConfig: {
                        phoneNumberId: '111'
                    }
                }
            )

            expect(result?.provider).toBe('whatsapp')
            expect(result?.externalUserId).toBe('15551234567')
            expect(result?.text).toBe('hello from wa')
        })
    })
})
