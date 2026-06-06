import { convertMultiOptionsToStringArray, getCredentialData, getCredentialParam } from '../../../src/utils'
import { createJungleGridTools, DEFAULT_JUNGLE_GRID_BASE_URL, JungleGridAction, JungleGridClient } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

const ALL_ACTIONS: { label: string; name: JungleGridAction }[] = [
    { label: 'Estimate Job', name: 'estimateJob' },
    { label: 'Submit Job', name: 'submitJob' },
    { label: 'List Jobs', name: 'listJobs' },
    { label: 'Get Job', name: 'getJob' },
    { label: 'Get Job Runtime', name: 'getJobRuntime' },
    { label: 'Cancel Job', name: 'cancelJob' },
    { label: 'Get Job Logs', name: 'getJobLogs' },
    { label: 'List Artifacts', name: 'listArtifacts' },
    { label: 'Get Artifact', name: 'getArtifact' }
]

class JungleGrid_Tools implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]
    documentation?: string

    constructor() {
        this.label = 'Jungle Grid'
        this.name = 'jungleGrid'
        this.version = 1.0
        this.type = 'JungleGrid'
        this.icon = 'junglegrid.svg'
        this.category = 'Tools'
        this.description = 'Estimate, submit, monitor, cancel, and retrieve artifacts for asynchronous Jungle Grid workloads'
        this.documentation = 'https://junglegrid.dev/docs/api'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Jungle Grid Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['jungleGridApi']
        }
        this.inputs = [
            {
                label: 'Actions',
                name: 'actions',
                type: 'multiOptions',
                options: ALL_ACTIONS,
                default: ['estimateJob', 'submitJob', 'getJob', 'getJobRuntime', 'getJobLogs', 'listArtifacts', 'getArtifact'],
                description: 'Choose which Jungle Grid tools to expose to the agent.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData) as string
        const baseUrl = (getCredentialParam('baseUrl', credentialData, nodeData) as string) || DEFAULT_JUNGLE_GRID_BASE_URL
        const actions = convertMultiOptionsToStringArray(nodeData.inputs?.actions) as JungleGridAction[]

        const client = new JungleGridClient({ apiKey, baseUrl })
        return createJungleGridTools(client, actions)
    }
}

module.exports = { nodeClass: JungleGrid_Tools }
