import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

const TIMEZONE_OPTIONS: { label: string; name: string }[] = (() => {
    try {
        const tzs: string[] = (Intl as any).supportedValuesOf?.('timeZone') ?? []
        if (Array.isArray(tzs) && tzs.length > 0) {
            return [{ label: 'UTC', name: 'UTC' }, ...tzs.filter((t) => t !== 'UTC').map((t) => ({ label: t, name: t }))]
        }
    } catch {
        /* fall through to curated fallback */
    }
    return [
        { label: 'UTC', name: 'UTC' },
        { label: 'America/Los_Angeles', name: 'America/Los_Angeles' },
        { label: 'America/Denver', name: 'America/Denver' },
        { label: 'America/Chicago', name: 'America/Chicago' },
        { label: 'America/New_York', name: 'America/New_York' },
        { label: 'America/Sao_Paulo', name: 'America/Sao_Paulo' },
        { label: 'Europe/London', name: 'Europe/London' },
        { label: 'Europe/Paris', name: 'Europe/Paris' },
        { label: 'Europe/Berlin', name: 'Europe/Berlin' },
        { label: 'Africa/Cairo', name: 'Africa/Cairo' },
        { label: 'Asia/Dubai', name: 'Asia/Dubai' },
        { label: 'Asia/Kolkata', name: 'Asia/Kolkata' },
        { label: 'Asia/Singapore', name: 'Asia/Singapore' },
        { label: 'Asia/Shanghai', name: 'Asia/Shanghai' },
        { label: 'Asia/Tokyo', name: 'Asia/Tokyo' },
        { label: 'Australia/Sydney', name: 'Australia/Sydney' },
        { label: 'Pacific/Auckland', name: 'Pacific/Auckland' }
    ]
})()

class Start_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    hideInput: boolean
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Start'
        this.name = 'startAgentflow'
        this.version = 1.4
        this.type = 'Start'
        this.category = 'Agent Flows'
        this.description = 'Starting point of the agentflow'
        this.baseClasses = [this.type]
        this.color = '#7EE787'
        this.hideInput = true
        this.inputs = [
            {
                label: 'Input Type',
                name: 'startInputType',
                type: 'options',
                options: [
                    {
                        label: 'Chat Input',
                        name: 'chatInput',
                        description: 'Start the conversation with chat input'
                    },
                    {
                        label: 'Form Input',
                        name: 'formInput',
                        description: 'Start the workflow with form inputs',
                        client: ['agentflowv2']
                    },
                    {
                        label: 'Webhook Trigger',
                        name: 'webhookTrigger',
                        description: 'Trigger the workflow via an external webhook',
                        client: ['agentflowv2']
                    },
                    {
                        label: 'Schedule Input',
                        name: 'scheduleInput',
                        description: 'Start the workflow on a recurring schedule (cron)',
                        client: ['agentflowv2']
                    }
                ],
                default: 'chatInput'
            },
            {
                label: 'Form Title',
                name: 'formTitle',
                type: 'string',
                placeholder: 'Please Fill Out The Form',
                show: {
                    startInputType: 'formInput'
                }
            },
            {
                label: 'Form Description',
                name: 'formDescription',
                type: 'string',
                placeholder: 'Complete all fields below to continue',
                show: {
                    startInputType: 'formInput'
                }
            },
            {
                label: 'Form Input Types',
                name: 'formInputTypes',
                description: 'Specify the type of form input',
                type: 'array',
                show: {
                    startInputType: 'formInput'
                },
                array: [
                    {
                        label: 'Type',
                        name: 'type',
                        type: 'options',
                        options: [
                            {
                                label: 'String',
                                name: 'string'
                            },
                            {
                                label: 'Number',
                                name: 'number'
                            },
                            {
                                label: 'Boolean',
                                name: 'boolean'
                            },
                            {
                                label: 'Options',
                                name: 'options'
                            }
                        ],
                        default: 'string'
                    },
                    {
                        label: 'Label',
                        name: 'label',
                        type: 'string',
                        placeholder: 'Label for the input'
                    },
                    {
                        label: 'Variable Name',
                        name: 'name',
                        type: 'string',
                        placeholder: 'Variable name for the input (must be camel case)',
                        description: 'Variable name must be camel case. For example: firstName, lastName, etc.'
                    },
                    {
                        label: 'Add Options',
                        name: 'addOptions',
                        type: 'array',
                        show: {
                            'formInputTypes[$index].type': 'options'
                        },
                        array: [
                            {
                                label: 'Option',
                                name: 'option',
                                type: 'string'
                            }
                        ]
                    }
                ]
            },
            {
                label: 'HTTP Method',
                name: 'webhookMethod',
                type: 'options',
                options: [
                    { label: 'GET', name: 'GET' },
                    { label: 'POST', name: 'POST' },
                    { label: 'PUT', name: 'PUT' },
                    { label: 'PATCH', name: 'PATCH' },
                    { label: 'DELETE', name: 'DELETE' }
                ],
                default: 'POST',
                show: {
                    startInputType: 'webhookTrigger'
                }
            },
            {
                label: 'Content Type',
                name: 'webhookContentType',
                type: 'options',
                description:
                    'Expected Content-Type of incoming requests. For application/x-www-form-urlencoded, if the entire payload is a JSON string in a "payload" field (e.g. GitHub webhooks), it is automatically parsed — use $webhook.body.* as normal.',
                options: [
                    { label: 'application/json', name: 'application/json' },
                    { label: 'application/x-www-form-urlencoded', name: 'application/x-www-form-urlencoded' }
                ],
                default: 'application/json',
                optional: true,
                show: {
                    startInputType: 'webhookTrigger'
                }
            },
            {
                label: 'Webhook URL',
                name: 'webhookURL',
                type: 'string',
                description: 'Send a request to this URL to trigger the workflow',
                optional: true,
                show: {
                    startInputType: 'webhookTrigger'
                }
            },
            {
                label: 'Input Mode',
                name: 'webhookInputMode',
                type: 'options',
                description: 'What this Start node passes as input to the rest of the flow when a webhook fires.',
                options: [
                    {
                        label: 'Custom Text',
                        name: 'text',
                        description:
                            'Pass a fixed string. Reference webhook fields with $webhook.body.* / $webhook.headers.* / $webhook.query.*'
                    },
                    {
                        label: 'No Input',
                        name: 'none',
                        description: 'Pass nothing. Use $webhook.* references inside downstream node configs to access the payload.'
                    },
                    {
                        label: 'Full Webhook Payload',
                        name: 'payload',
                        description:
                            'Pass the full JSON-serialized webhook payload (body, headers, query). Useful for debugging; bloats LLM context.'
                    }
                ],
                default: 'text',
                show: {
                    startInputType: 'webhookTrigger'
                }
            },
            {
                label: 'Custom Text',
                name: 'webhookDefaultInput',
                type: 'string',
                rows: 3,
                placeholder: 'Answer user question: {{ $webhook.body.question }}',
                description:
                    'Text passed to downstream nodes as the user input. Use {{ $webhook.body.* }}, {{ $webhook.headers.* }}, or {{ $webhook.query.* }} to interpolate fields from the incoming request.',
                optional: true,
                acceptVariable: true,
                show: {
                    startInputType: 'webhookTrigger',
                    webhookInputMode: 'text'
                }
            },
            {
                label: 'Verify request signature',
                name: 'webhookEnableAuth',
                type: 'boolean',
                description:
                    'Reject incoming requests that do not include a valid signature. Turn this on if your sender (GitHub, Stripe, Slack, GitLab, etc.) signs each request with a shared secret, then generate a secret below and copy it to the sender. Leave off for testing or trusted networks.',
                default: false,
                optional: true,
                show: {
                    startInputType: 'webhookTrigger'
                }
            },
            {
                label: 'Webhook Secret',
                name: 'webhookSecret',
                type: 'string',
                description:
                    'Click Generate Secret to create a random shared secret, then copy it into your sender so it can sign each request. Use Signature Header and Signature Type below to match how your sender delivers the signature.',
                optional: true,
                show: {
                    startInputType: 'webhookTrigger',
                    webhookEnableAuth: true
                }
            },
            {
                label: 'Signature Header',
                name: 'webhookSignatureHeader',
                type: 'string',
                description:
                    'The request header that carries the signature. e.g. x-hub-signature-256 for GitHub, stripe-signature for Stripe, x-gitlab-token for GitLab.',
                placeholder: 'x-webhook-signature',
                optional: true,
                show: {
                    startInputType: 'webhookTrigger',
                    webhookEnableAuth: true
                }
            },
            {
                label: 'Signature Type',
                name: 'webhookSignatureType',
                type: 'options',
                description:
                    'How to verify the signature. HMAC-SHA256 for GitHub, Stripe, Slack (supports sha256=<hex> prefix automatically). Plain Token for GitLab-style plain secret comparison.',
                options: [
                    { label: 'HMAC-SHA256', name: 'hmac-sha256' },
                    { label: 'Plain Token', name: 'plain-token' }
                ],
                default: 'hmac-sha256',
                optional: true,
                show: {
                    startInputType: 'webhookTrigger',
                    webhookEnableAuth: true
                }
            },
            {
                label: 'Response Mode',
                name: 'webhookResponseMode',
                type: 'options',
                description: 'How Flowise replies to the incoming webhook request.',
                options: [
                    {
                        label: 'Synchronous',
                        name: 'sync',
                        description:
                            'Wait for the flow to finish and return the full result as JSON. Simple but blocks the caller; can time out for senders with short HTTP windows.'
                    },
                    {
                        label: 'Asynchronous (callback)',
                        name: 'async',
                        description:
                            'Return 202 Accepted immediately and run the flow in the background. Set a Callback URL below to have the result POSTed there when the flow finishes; leave it blank for fire-and-forget. Best for senders with short HTTP timeouts.'
                    },
                    {
                        label: 'Streaming (SSE)',
                        name: 'stream',
                        description:
                            'Return a Server-Sent Events stream so the caller sees tokens and agent steps as they happen. Best for custom callers (browsers using fetch+ReadableStream, internal services). NOT compatible with senders that expect a single quick response.'
                    }
                ],
                default: 'sync',
                show: {
                    startInputType: 'webhookTrigger'
                }
            },
            {
                label: 'Callback URL',
                name: 'callbackUrl',
                type: 'string',
                description:
                    'Optional. Flowise will POST the flow result to this URL when the flow finishes. Leave blank for fire-and-forget — the flow still runs in the background, but no callback is delivered.',
                placeholder: 'https://example.com/flowise-callback',
                optional: true,
                show: {
                    startInputType: 'webhookTrigger',
                    webhookResponseMode: 'async'
                }
            },
            {
                label: 'Callback Secret',
                name: 'callbackSecret',
                type: 'string',
                description:
                    'Optional. If set, outgoing callback POSTs are signed with HMAC-SHA256 and delivered as X-Flowise-Signature: sha256=<hex> so your callback endpoint can verify the request came from Flowise.',
                optional: true,
                show: {
                    startInputType: 'webhookTrigger',
                    webhookResponseMode: 'async'
                }
            },
            {
                label: 'Validate request shape',
                name: 'webhookEnableValidation',
                type: 'boolean',
                description:
                    'Reject requests that are missing required headers, body fields, or query parameters declared below. Turn this on to enforce a request contract and catch bad requests early. Leave off to accept any payload and let the flow handle validation itself.',
                default: false,
                optional: true,
                show: {
                    startInputType: 'webhookTrigger'
                }
            },
            {
                label: 'Expected Query Parameters',
                name: 'webhookQueryParams',
                description: 'Declare expected query parameters. Leave empty to accept any.',
                type: 'array',
                optional: true,
                show: {
                    startInputType: 'webhookTrigger',
                    webhookEnableValidation: true
                },
                array: [
                    {
                        label: 'Variable Name',
                        name: 'name',
                        type: 'string',
                        placeholder: 'e.g. page'
                    },
                    {
                        label: 'Required',
                        name: 'required',
                        type: 'boolean'
                    }
                ]
            },
            {
                label: 'Expected Body Parameters',
                name: 'webhookBodyParams',
                description: 'Define expected parameters in the webhook request body. Leave empty to accept any JSON body.',
                type: 'array',
                optional: true,
                show: {
                    startInputType: 'webhookTrigger',
                    webhookEnableValidation: true
                },
                array: [
                    {
                        label: 'Variable Name',
                        name: 'name',
                        type: 'string',
                        placeholder: 'e.g. userId'
                    },
                    {
                        label: 'Type',
                        name: 'type',
                        type: 'options',
                        options: [
                            {
                                label: 'String',
                                name: 'string'
                            },
                            {
                                label: 'Number',
                                name: 'number'
                            },
                            {
                                label: 'Boolean',
                                name: 'boolean'
                            },
                            {
                                label: 'Object',
                                name: 'object',
                                hide: { webhookContentType: 'application/x-www-form-urlencoded' }
                            },
                            {
                                label: 'Array[String]',
                                name: 'array[string]',
                                hide: { webhookContentType: 'application/x-www-form-urlencoded' }
                            },
                            {
                                label: 'Array[Number]',
                                name: 'array[number]',
                                hide: { webhookContentType: 'application/x-www-form-urlencoded' }
                            },
                            {
                                label: 'Array[Boolean]',
                                name: 'array[boolean]',
                                hide: { webhookContentType: 'application/x-www-form-urlencoded' }
                            },
                            {
                                label: 'Array[Object]',
                                name: 'array[object]',
                                hide: { webhookContentType: 'application/x-www-form-urlencoded' }
                            }
                        ],
                        default: 'string'
                    },
                    {
                        label: 'Required',
                        name: 'required',
                        type: 'boolean'
                    }
                ]
            },
            {
                label: 'Expected Headers',
                name: 'webhookHeaderParams',
                description: 'Declare expected request headers. Leave empty to accept any.',
                type: 'array',
                optional: true,
                show: {
                    startInputType: 'webhookTrigger',
                    webhookEnableValidation: true
                },
                array: [
                    {
                        label: 'Header Name',
                        name: 'name',
                        type: 'string',
                        placeholder: 'e.g. x-github-event'
                    },
                    {
                        label: 'Required',
                        name: 'required',
                        type: 'boolean'
                    }
                ]
            },
            {
                label: 'Schedule Type',
                name: 'scheduleType',
                type: 'options',
                options: [
                    {
                        label: 'Visual Picker',
                        name: 'visualPicker',
                        description: 'Use a visual picker to select schedule options'
                    },
                    {
                        label: 'Cron Expression',
                        name: 'cronExpression',
                        description: 'Use a cron expression to define the schedule'
                    }
                ],
                default: 'visualPicker',
                show: {
                    startInputType: 'scheduleInput'
                }
            },
            {
                label: 'Cron Expression',
                name: 'scheduleCronExpression',
                type: 'string',
                placeholder: '0 9 * * 1-5',
                description:
                    'Standard 5-field cron expression (minute hour day month weekday). Example: "0 9 * * 1-5" runs at 09:00 every weekday.',
                show: {
                    startInputType: 'scheduleInput',
                    scheduleType: 'cronExpression'
                }
            },
            {
                label: 'Frequency',
                name: 'scheduleFrequency',
                type: 'options',
                options: [
                    {
                        label: 'Hourly',
                        name: 'hourly',
                        description: 'Run every hour at the specified time'
                    },
                    {
                        label: 'Daily',
                        name: 'daily',
                        description: 'Run every day at the specified time'
                    },
                    {
                        label: 'Weekly',
                        name: 'weekly',
                        description: 'Run every week on the specified day and time'
                    },
                    {
                        label: 'Monthly',
                        name: 'monthly',
                        description: 'Run every month on the specified date and time'
                    }
                ],
                show: {
                    startInputType: 'scheduleInput',
                    scheduleType: 'visualPicker'
                }
            },
            {
                label: 'On Minute',
                name: 'scheduleOnMinute',
                type: 'number',
                placeholder: '30',
                description:
                    'Minute of the hour when the schedule should run (0-59). For example, "30" means the schedule will run at the 30th minute of the hour.',
                show: {
                    startInputType: 'scheduleInput',
                    scheduleType: 'visualPicker',
                    scheduleFrequency: 'hourly'
                }
            },
            {
                label: 'On Time',
                name: 'scheduleOnTime',
                type: 'timePicker',
                show: {
                    startInputType: 'scheduleInput',
                    scheduleType: 'visualPicker',
                    scheduleFrequency: ['daily', 'weekly', 'monthly']
                }
            },
            {
                label: 'On Day of Week',
                name: 'scheduleOnDayOfWeek',
                type: 'weekDaysPicker',
                show: {
                    startInputType: 'scheduleInput',
                    scheduleType: 'visualPicker',
                    scheduleFrequency: 'weekly'
                }
            },
            {
                label: 'On Day of Month',
                name: 'scheduleOnDayOfMonth',
                type: 'monthDaysPicker',
                show: {
                    startInputType: 'scheduleInput',
                    scheduleType: 'visualPicker',
                    scheduleFrequency: 'monthly'
                }
            },
            {
                label: 'End Date',
                name: 'scheduleEndDate',
                type: 'datePicker',
                description: 'Optional date after which the schedule will stop firing.',
                optional: true,
                show: {
                    startInputType: 'scheduleInput'
                }
            },
            {
                label: 'Timezone',
                name: 'scheduleTimezone',
                type: 'options',
                options: TIMEZONE_OPTIONS,
                default: 'UTC',
                description: 'IANA timezone. Defaults to UTC.',
                optional: true,
                show: {
                    startInputType: 'scheduleInput'
                }
            },
            {
                label: 'Schedule Input Mode',
                name: 'scheduleInputMode',
                type: 'options',
                description: 'How the schedule should invoke this flow on each fire.',
                options: [
                    {
                        label: 'Default Text Input',
                        name: 'text',
                        description: 'Pass a fixed text string as the question on every fire'
                    },
                    {
                        label: 'Form Input',
                        name: 'form',
                        description: 'Pass default values for the form fields below on every fire'
                    },
                    {
                        label: 'No Input',
                        name: 'none',
                        description: 'Fire with no input.'
                    }
                ],
                default: 'text',
                show: {
                    startInputType: 'scheduleInput'
                }
            },
            {
                label: 'Default Input',
                name: 'scheduleDefaultInput',
                type: 'string',
                placeholder: 'Run the daily report',
                description: 'Default question/input passed to the flow when it is triggered by the scheduler.',
                rows: 4,
                show: {
                    startInputType: 'scheduleInput',
                    scheduleInputMode: 'text'
                }
            },
            {
                label: 'Form Fields',
                name: 'scheduleFormInputTypes',
                description: 'Define the typed fields this scheduled flow receives on each fire.',
                type: 'array',
                show: {
                    startInputType: 'scheduleInput',
                    scheduleInputMode: 'form'
                },
                array: [
                    {
                        label: 'Type',
                        name: 'type',
                        type: 'options',
                        options: [
                            { label: 'String', name: 'string' },
                            { label: 'Number', name: 'number' },
                            { label: 'Boolean', name: 'boolean' },
                            { label: 'Options', name: 'options' }
                        ],
                        default: 'string'
                    },
                    {
                        label: 'Label',
                        name: 'label',
                        type: 'string',
                        placeholder: 'Label for the input'
                    },
                    {
                        label: 'Variable Name',
                        name: 'name',
                        type: 'string',
                        placeholder: 'Variable name for the input (must be camel case)',
                        description: 'Variable name must be camel case. For example: firstName, lastName, etc.'
                    },
                    {
                        label: 'Add Options',
                        name: 'addOptions',
                        type: 'array',
                        show: {
                            'scheduleFormInputTypes[$index].type': 'options'
                        },
                        array: [
                            {
                                label: 'Option',
                                name: 'option',
                                type: 'string'
                            }
                        ]
                    }
                ]
            },
            {
                label: 'Default Form Values',
                name: 'scheduleFormDefaults',
                type: 'json',
                description:
                    'Default values for the form fields above, as a JSON object keyed by variable name. Example: { "team": "engineering", "metric": "p95" }',
                optional: true,
                show: {
                    startInputType: 'scheduleInput',
                    scheduleInputMode: 'form'
                }
            },
            {
                label: 'Ephemeral Memory',
                name: 'startEphemeralMemory',
                type: 'boolean',
                description: 'Start fresh for every execution without past chat history',
                optional: true
            },
            {
                label: 'Flow State',
                name: 'startState',
                description: 'Runtime state during the execution of the workflow',
                type: 'array',
                optional: true,
                array: [
                    {
                        label: 'Key',
                        name: 'key',
                        type: 'string',
                        placeholder: 'Foo'
                    },
                    {
                        label: 'Value',
                        name: 'value',
                        type: 'string',
                        placeholder: 'Bar',
                        optional: true
                    }
                ]
            },
            {
                label: 'Persist State',
                name: 'startPersistState',
                type: 'boolean',
                description: 'Persist the state in the same session',
                optional: true
            }
        ]
    }

    async run(nodeData: INodeData, input: string | Record<string, any>, options: ICommonObject): Promise<any> {
        const _flowState = nodeData.inputs?.startState as string
        const startInputType = nodeData.inputs?.startInputType as string
        const startEphemeralMemory = nodeData.inputs?.startEphemeralMemory as boolean
        const startPersistState = nodeData.inputs?.startPersistState as boolean

        let flowStateArray = []
        if (_flowState) {
            try {
                flowStateArray = typeof _flowState === 'string' ? JSON.parse(_flowState) : _flowState
            } catch (error) {
                throw new Error('Invalid Flow State')
            }
        }

        let flowState: Record<string, any> = {}
        for (const state of flowStateArray) {
            flowState[state.key] = state.value
        }

        const runtimeState = options.agentflowRuntime?.state as ICommonObject
        if (startPersistState === true && runtimeState && Object.keys(runtimeState).length) {
            for (const state in runtimeState) {
                flowState[state] = runtimeState[state]
            }
        }

        const inputData: ICommonObject = {}
        const outputData: ICommonObject = {}

        if (startInputType === 'chatInput') {
            inputData.question = input
            outputData.question = input
        }

        if (startInputType === 'formInput') {
            inputData.form = {
                title: nodeData.inputs?.formTitle,
                description: nodeData.inputs?.formDescription,
                inputs: nodeData.inputs?.formInputTypes
            }

            let form = input
            if (options.agentflowRuntime?.form && Object.keys(options.agentflowRuntime.form).length) {
                form = options.agentflowRuntime.form
            }
            outputData.form = form
        }

        if (startInputType === 'webhookTrigger') {
            const webhookInputMode = (nodeData.inputs?.webhookInputMode as string) || 'text'

            // Always preserve the webhook payload in inputData/outputData so downstream nodes can
            // reference $webhook.* and human-input resume can restore the original trigger data.
            // The runtime fallback is the authoritative source when set (text/none modes don't pass
            // the payload through `input`); otherwise parse it back from the JSON string `input`.
            let webhookPayload: any =
                options.agentflowRuntime?.webhook && Object.keys(options.agentflowRuntime.webhook).length
                    ? options.agentflowRuntime.webhook
                    : input
            if (typeof webhookPayload === 'string') {
                try {
                    webhookPayload = JSON.parse(webhookPayload)
                } catch (_) {
                    /* leave as string if not valid JSON */
                }
            }
            inputData.webhook = webhookPayload
            outputData.webhook = webhookPayload

            if (webhookInputMode === 'none') {
                // Single-space sentinel — same convention as scheduleInputMode='none'.
                inputData.question = ' '
                outputData.question = ' '
            } else if (webhookInputMode === 'text') {
                // executeAgentFlow pre-resolves $webhook.* refs and passes the result as `input`.
                const resolved = (typeof input === 'string' && input) || ' '
                inputData.question = resolved
                outputData.question = resolved
            }
            // mode='payload' — webhook is exposed via outputData.webhook; no `question` is set.
        }

        if (startInputType === 'scheduleInput') {
            const scheduleInputMode = (nodeData.inputs?.scheduleInputMode as string) || 'text'
            if (scheduleInputMode === 'form') {
                inputData.form = {
                    inputs: nodeData.inputs?.scheduleFormInputTypes
                }
                let form: any = input
                if (options.agentflowRuntime?.form && Object.keys(options.agentflowRuntime.form).length) {
                    form = options.agentflowRuntime.form
                }
                outputData.form = form
            } else if (scheduleInputMode === 'none') {
                // Single-space sentinel matches the engine's "no input" fallback at buildAgentflow.ts:2247
                // and avoids downstream Agent nodes filtering the user message and producing an empty messages[].
                inputData.question = ' '
                outputData.question = ' '
            } else {
                const defaultInput = nodeData.inputs?.scheduleDefaultInput as string
                const effectiveInput = (typeof input === 'string' && input) || defaultInput || ''
                inputData.question = effectiveInput
                outputData.question = effectiveInput
            }
        }

        if (startEphemeralMemory) {
            outputData.ephemeralMemory = true
        }

        if (startPersistState) {
            outputData.persistState = true
        }

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: inputData,
            output: outputData,
            state: flowState
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Start_Agentflow }
