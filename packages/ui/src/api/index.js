import * as apikeyApi from './apikey.js';
import * as assistantsApi from './assistants.js';
import * as attachmentsApi from './attachments.js';
import * as chatflowsApi from './chatflows.js';
import * as chatmessageApi from './chatmessage.js';
import * as chatmessagefeedbackApi from './chatmessagefeedback.js';
import * as clientApi from './client.js';
import * as configApi from './config.js';
import * as credentialsApi from './credentials.js';
import * as documentstoreApi from './documentstore.js';
import * as executionsApi from './executions.js';
import * as exportimportApi from './exportimport.js';
import * as feedbackApi from './feedback.js';
import * as leadApi from './lead.js';
import * as marketplacesApi from './marketplaces.js';
import * as nodesApi from './nodes.js';
import * as predictionApi from './prediction.js';
import * as promptApi from './prompt.js';
import * as scraperApi from './scraper.js';
import * as toolsApi from './tools.js';
import * as validationApi from './validation.js';
import * as variablesApi from './variables.js';
import * as vectorstoreApi from './vectorstore.js';

const api = {
    apikey: apikeyApi,
    assistants: assistantsApi,
    attachments: attachmentsApi,
    chatflows: chatflowsApi,
    chatmessage: chatmessageApi,
    chatmessagefeedback: chatmessagefeedbackApi,
    client: clientApi,
    config: configApi,
    credentials: credentialsApi,
    documentstore: documentstoreApi,
    executions: executionsApi,
    exportimport: exportimportApi,
    feedback: feedbackApi,
    lead: leadApi,
    marketplaces: marketplacesApi,
    nodes: nodesApi,
    prediction: predictionApi,
    prompt: promptApi,
    scraper: scraperApi,
    tools: toolsApi,
    validation: validationApi,
    variables: variablesApi,
    vectorstore: vectorstoreApi
};

export default api;
