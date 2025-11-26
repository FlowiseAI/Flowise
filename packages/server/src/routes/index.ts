import express from 'express'
import apikeyRouter from './apikey'
import assistantsRouter from './assistants'
import attachmentsRouter from './attachments'
import chatMessageRouter from './chat-messages'
import chatflowsRouter from './chatflows'
import chatflowsStreamingRouter from './chatflows-streaming'
import chatflowsUploadsRouter from './chatflows-uploads'
import componentsCredentialsRouter from './components-credentials'
import componentsCredentialsIconRouter from './components-credentials-icon'
import credentialsRouter from './credentials'
import datasetRouter from './dataset'
import documentStoreRouter from './documentstore'
import evaluationsRouter from './evaluations'
import evaluatorsRouter from './evaluator'
import exportImportRouter from './export-import'
import feedbackRouter from './feedback'
import fetchLinksRouter from './fetch-links'
import filesRouter from './files'
import flowConfigRouter from './flow-config'
import getUploadFileRouter from './get-upload-file'
import getUploadPathRouter from './get-upload-path'
import internalChatmessagesRouter from './internal-chat-messages'
import internalPredictionRouter from './internal-predictions'
import leadsRouter from './leads'
import loadPromptRouter from './load-prompts'
import logsRouter from './log'
import marketplacesRouter from './marketplaces'
import nodeConfigRouter from './node-configs'
import nodeCustomFunctionRouter from './node-custom-functions'
import nodeIconRouter from './node-icons'
import nodeLoadMethodRouter from './node-load-methods'
import nodesRouter from './nodes'
import oauth2Router from './oauth2'
import openaiAssistantsRouter from './openai-assistants'
import openaiAssistantsFileRouter from './openai-assistants-files'
import openaiAssistantsVectorStoreRouter from './openai-assistants-vector-store'
import openaiRealtimeRouter from './openai-realtime'
import pingRouter from './ping'
import predictionRouter from './predictions'
import promptListsRouter from './prompts-lists'
import publicChatbotRouter from './public-chatbots'
import publicChatflowsRouter from './public-chatflows'
import publicExecutionsRouter from './public-executions'
import settingsRouter from './settings'
import statsRouter from './stats'
import toolsRouter from './tools'
import upsertHistoryRouter from './upsert-history'
import variablesRouter from './variables'
import vectorRouter from './vectors'
import verifyRouter from './verify'
import versionRouter from './versions'
import pricingRouter from './pricing'
import nvidiaNimRouter from './nvidia-nim'
import executionsRouter from './executions'
import validationRouter from './validation'
import agentflowv2GeneratorRouter from './agentflowv2-generator'
import textToSpeechRouter from './text-to-speech'

import authRouter from '../enterprise/routes/auth'
import auditRouter from '../enterprise/routes/audit'
import userRouter from '../enterprise/routes/user.route'
import organizationRouter from '../enterprise/routes/organization.route'
import roleRouter from '../enterprise/routes/role.route'
import organizationUserRoute from '../enterprise/routes/organization-user.route'
import workspaceRouter from '../enterprise/routes/workspace.route'
import workspaceUserRouter from '../enterprise/routes/workspace-user.route'
import accountRouter from '../enterprise/routes/account.route'
import loginMethodRouter from '../enterprise/routes/login-method.route'
import { IdentityManager } from '../IdentityManager'

const router = express.Router()

router.use('/ping', pingRouter)
router.use('/apikey', apikeyRouter)
router.use('/assistants', assistantsRouter)
router.use('/attachments', attachmentsRouter)
router.use('/chatflows', chatflowsRouter)
router.use('/chatflows-streaming', chatflowsStreamingRouter)
router.use('/chatmessage', chatMessageRouter)
router.use('/chatflows-uploads', chatflowsUploadsRouter)
router.use('/components-credentials', componentsCredentialsRouter)
router.use('/components-credentials-icon', componentsCredentialsIconRouter)
router.use('/credentials', credentialsRouter)
router.use('/datasets', IdentityManager.checkFeatureByPlan('feat:datasets'), datasetRouter)
router.use('/document-store', documentStoreRouter)
router.use('/evaluations', IdentityManager.checkFeatureByPlan('feat:evaluations'), evaluationsRouter)
router.use('/evaluators', IdentityManager.checkFeatureByPlan('feat:evaluators'), evaluatorsRouter)
router.use('/export-import', exportImportRouter)
router.use('/feedback', feedbackRouter)
router.use('/fetch-links', fetchLinksRouter)
router.use('/flow-config', flowConfigRouter)
router.use('/internal-chatmessage', internalChatmessagesRouter)
router.use('/internal-prediction', internalPredictionRouter)
router.use('/get-upload-file', getUploadFileRouter)
router.use('/get-upload-path', getUploadPathRouter)
router.use('/leads', leadsRouter)
router.use('/load-prompt', loadPromptRouter)
router.use('/marketplaces', marketplacesRouter)
router.use('/node-config', nodeConfigRouter)
router.use('/node-custom-function', nodeCustomFunctionRouter)
router.use('/node-icon', nodeIconRouter)
router.use('/node-load-method', nodeLoadMethodRouter)
router.use('/nodes', nodesRouter)
router.use('/oauth2-credential', oauth2Router)
router.use('/openai-assistants', openaiAssistantsRouter)
router.use('/openai-assistants-file', openaiAssistantsFileRouter)
router.use('/openai-assistants-vector-store', openaiAssistantsVectorStoreRouter)
router.use('/openai-realtime', openaiRealtimeRouter)
router.use('/prediction', predictionRouter)
router.use('/prompts-list', promptListsRouter)
router.use('/public-chatbotConfig', publicChatbotRouter)
router.use('/public-chatflows', publicChatflowsRouter)
router.use('/public-executions', publicExecutionsRouter)
router.use('/stats', statsRouter)
router.use('/tools', toolsRouter)
router.use('/variables', variablesRouter)
router.use('/vector', vectorRouter)
router.use('/verify', verifyRouter)
router.use('/version', versionRouter)
router.use('/upsert-history', upsertHistoryRouter)
router.use('/settings', settingsRouter)
router.use('/pricing', pricingRouter)
router.use('/nvidia-nim', nvidiaNimRouter)
router.use('/executions', executionsRouter)
router.use('/validation', validationRouter)
router.use('/agentflowv2-generator', agentflowv2GeneratorRouter)
router.use('/text-to-speech', textToSpeechRouter)

router.use('/auth', authRouter)
router.use('/audit', IdentityManager.checkFeatureByPlan('feat:login-activity'), auditRouter)
router.use('/user', userRouter)
router.use('/organization', organizationRouter)
router.use('/role', IdentityManager.checkFeatureByPlan('feat:roles'), roleRouter)
router.use('/organizationuser', organizationUserRoute)
router.use('/workspace', workspaceRouter)
router.use('/workspaceuser', workspaceUserRouter)
router.use('/account', accountRouter)
router.use('/loginmethod', loginMethodRouter)
router.use('/logs', IdentityManager.checkFeatureByPlan('feat:logs'), logsRouter)
router.use('/files', IdentityManager.checkFeatureByPlan('feat:files'), filesRouter)

export default router
