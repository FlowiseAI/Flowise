import express, { NextFunction, Request, Response, Router } from 'express'
import crypto from 'crypto'
import axios from 'axios'
import { v4 } from 'uuid'

const router: Router = express.Router()

export const CHATWOOT_ACCESS_KEY = process.env.CHATWOOT_ACCESS_KEY || 'b4RScnnsA6Nc4sfPQe2B9XY1' // test only
export const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL || 'http://203.145.47.214:8003' // test only
export const CHATWOOT_ACCOUNT_ID = 2

// User routes
router.post('/connect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: inboxes } = await axios.get(`${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/inboxes`, {
      headers: {
        api_access_token: CHATWOOT_ACCESS_KEY
      }
    })
    const inboxId = +inboxes.payload?.find((item: any) => item.website_token === req.body.id || item.inbox_identifier === req.body.id)?.id

    if (!inboxId) throw new Error('inbox not found')

    const contactIdentifier = crypto
      .createHash('md5')
      .update(
        JSON.stringify([
          CHATWOOT_ACCOUNT_ID,
          req.body.id, // inbox id
          req.body.userInfo?.phoneNumber || Date.now()
        ])
      )
      .digest('hex')

    const { data: searchContacts } = await axios.get(`${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search`, {
      params: {
        q: contactIdentifier
      },
      headers: {
        api_access_token: CHATWOOT_ACCESS_KEY
      }
    })
    let contactId = +searchContacts.payload?.[0]?.id

    if (!contactId) {
      const { data: createdContact } = await axios.post(
        `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts`,
        {
          inbox_id: inboxId,
          name: req.body.userInfo?.name,
          // phone_number:
          //   req.body.userInfo?.phoneNumber && !req.body.userInfo.phoneNumber.startsWith('+')
          //     ? `+${req.body.userInfo.phoneNumber}`
          //     : req.body.userInfo?.phoneNumber,
          // email: req.body.userInfo?.email,
          identifier: contactIdentifier,
          custom_attributes: req.body.userInfo
        },
        {
          headers: {
            api_access_token: CHATWOOT_ACCESS_KEY
          }
        }
      )
      contactId = createdContact?.payload?.contact?.id
    }

    const { data: createdConversation } = await axios.post(
      `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`,
      {
        // source_id: (req.body.chatId || Date.now() + '') + contactIdentifier,
        source_id: v4(),
        inbox_id: inboxId.toString(),
        contact_id: contactId.toString(),
        message: {
          content: `${req.body.userInfo?.name}, số điện thoại ${req.body.userInfo?.phoneNumber} đã tạo một yêu cầu hỗ trợ.`
        }
      },
      {
        headers: {
          api_access_token: CHATWOOT_ACCESS_KEY
        }
      }
    )

    return res.json({ contactId, conversation: createdConversation })
  } catch (e: any) {
    console.log('[Request error]', e?.response?.data)
    next(e)
  }
})

export default router
