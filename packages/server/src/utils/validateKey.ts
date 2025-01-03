import { Request } from 'express'
import { ChatFlow } from '../database/entities/ChatFlow'
import { compareKeys } from './apiKey'
import apikeyService from '../services/apikey'
const jwt = require('jsonwebtoken')

/**
 * Validate Chatflow API Key
 * @param {Request} req
 * @param {ChatFlow} chatflow
 */
export const validateChatflowAPIKey = async (req: Request, chatflow: ChatFlow) => {
  const chatFlowApiKeyId = chatflow?.apikeyid
  if (!chatFlowApiKeyId) return true

  const authorizationHeader = (req.headers['Authorization'] as string) ?? (req.headers['authorization'] as string) ?? ''
  if (chatFlowApiKeyId && !authorizationHeader) return false

  const suppliedKey = authorizationHeader.split(`Bearer `).pop()
  if (suppliedKey) {
    const keys = await apikeyService.getAllApiKeys(req)
    const apiSecret = keys.find((key: any) => key.id === chatFlowApiKeyId)?.apiSecret
    if (!compareKeys(apiSecret, suppliedKey)) return false
    return true
  }
  return false
}

/**
 * Validate API Key
 * @param {Request} req
 */
export const validateAPIKey = async (req: Request) => {
  const authorizationHeader = (req.headers['Authorization'] as string) ?? (req.headers['authorization'] as string) ?? ''
  if (!authorizationHeader) return null

  const suppliedKey = authorizationHeader.split(`Bearer `).pop()

  if (suppliedKey && process.env.LOGIN_TYPE === 'api-key') {
    const keys = await apikeyService.getAllApiKeys(req)
    const apiSecret = keys.find((key: any) => key.apiKey === suppliedKey)?.apiSecret
    if (!apiSecret) return null
    if (!compareKeys(apiSecret, suppliedKey)) return null
    return apiSecret
  }

  if (suppliedKey && process.env.LOGIN_TYPE === 'token') {
    try {
      const decoded = await jwt.verify(suppliedKey, process.env.ACCESS_TOKEN_SECRET)

      if (decoded.id) return decoded
    } catch (err) {
      return null
    }
  }

  return null
}
