import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

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
        this.version = 1.2
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
                        description: 'Start the workflow with form inputs'
                    },
                    {
                        label: 'Schedule Input',
                        name: 'scheduleInput',
                        description: 'Start the workflow on a recurring schedule (cron)'
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
                label: 'Timezone',
                name: 'scheduleTimezone',
                type: 'string',
                placeholder: 'UTC',
                description: 'IANA timezone name, e.g. America/New_York. Defaults to UTC.',
                optional: true,
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
                acceptVariable: true,
                rows: 4,
                show: {
                    startInputType: 'scheduleInput'
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

        if (startInputType === 'scheduleInput') {
            const defaultInput = nodeData.inputs?.scheduleDefaultInput as string
            const effectiveInput = (typeof input === 'string' && input) || defaultInput || ''
            inputData.question = effectiveInput
            outputData.question = effectiveInput
            outputData.scheduledAt = options.agentflowRuntime?.scheduledAt ?? new Date().toISOString()
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
