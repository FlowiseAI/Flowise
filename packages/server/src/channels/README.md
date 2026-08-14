# Channels Module

Enterprise-grade channel integration layer for Telegram, WhatsApp, and Instagram.

## Architecture

-   `ChannelAccount` (DB): provider account linked to an encrypted `Credential`
-   `AgentChannel` (DB): binding of account to a flow (`CHATFLOW` / `AGENTFLOW` / `MULTIAGENT`) with unique webhook path
-   `channels/*`: adapter contracts + provider adapters + execution orchestration
-   `services/channels`: account/binding management + runtime context resolution

## Security model

-   Secrets are never stored in `chatbotConfig`
-   Secrets are stored in existing encrypted `credential.encryptedData`
-   Webhooks are public only under `/api/v1/channel-webhooks/*`
-   Signature validation:
    -   Telegram: `X-Telegram-Bot-Api-Secret-Token`
    -   WhatsApp/Instagram (Meta): `X-Hub-Signature-256` HMAC SHA-256
-   Meta verification challenge supported via GET webhook endpoint

## Routes

Authenticated management routes:

-   `POST /api/v1/channels/accounts`
-   `GET /api/v1/channels/accounts`
-   `PUT /api/v1/channels/accounts/:id`
-   `DELETE /api/v1/channels/accounts/:id`
-   `POST /api/v1/channels/bindings`
-   `GET /api/v1/channels/bindings?chatflowId=<uuid>`
-   `PUT /api/v1/channels/bindings/:id`
-   `DELETE /api/v1/channels/bindings/:id`

Binding constraints:

-   Multiple channel accounts can be attached to the same flow.
-   The same channel account cannot be attached to the same flow more than once.

Public webhook routes:

-   `POST /api/v1/channel-webhooks/:provider/:webhookPath`
-   `GET /api/v1/channel-webhooks/:provider/:webhookPath` (Meta challenge for whatsapp/instagram)

## Credential types

Create credentials via existing credential API and link them to channel accounts.

-   `channelTelegram`: `{ botToken, webhookSecret? }`
-   `channelWhatsApp`: `{ appId?, wabaId?, phoneNumberId, accessToken, appSecret, verifyToken }`
-   `channelInstagram`: `{ appId?, instagramUserId, accessToken, appSecret, verifyToken }`

## Account config

Stored in `ChannelAccount.config` (non-secret settings):

-   Telegram: `{ disableWebPagePreview?: boolean }`
-   WhatsApp: `{ phoneNumberId?: string }` (optional override; defaults to credential field)
-   Instagram: `{ instagramUserId?: string }` (optional override; defaults to credential field)
