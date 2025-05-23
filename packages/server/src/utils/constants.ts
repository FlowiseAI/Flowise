export const WHITELIST_URLS = [
    '/api/v1/verify/apikey/',
    '/api/v1/chatflows/apikey/',
    '/api/v1/public-chatflows',
    '/api/v1/public-chatbotConfig',
    '/api/v1/public-executions',
    '/api/v1/prediction/',
    '/api/v1/vector/upsert/',
    '/api/v1/node-icon/',
    '/api/v1/components-credentials-icon/',
    '/api/v1/chatflows-streaming',
    '/api/v1/chatflows-uploads',
    '/api/v1/openai-assistants-file/download',
    '/api/v1/feedback',
    '/api/v1/leads',
    '/api/v1/get-upload-file',
    '/api/v1/ip',
    '/api/v1/ping',
    '/api/v1/version',
    '/api/v1/attachments',
    '/api/v1/metrics',
    '/api/v1/nvidia-nim'
]

export const OMIT_QUEUE_JOB_DATA = ['componentNodes', 'appDataSource', 'sseStreamer', 'telemetry', 'cachePool']

export const INPUT_PARAMS_TYPE = [
    'asyncOptions',
    'asyncMultiOptions',
    'options',
    'multiOptions',
    'array',
    'datagrid',
    'string',
    'number',
    'boolean',
    'password',
    'json',
    'code',
    'date',
    'file',
    'folder',
    'tabs'
]
