// packages/components/nodes/tools/ParallelSubflows/ParallelSubflows.ts
import { ParallelSubflowsTool, type ParallelSubflowsConfig } from './core'
import type { INode, INodeData, INodeParams, ICommonObject, IDatabaseEntity } from '../../../src/Interface'
import { getVars, prepareSandboxVars } from '../../../src/utils'
import type { DataSource } from 'typeorm'

function substituteVariablesInObject(obj: any, sandbox: any): any {
  if (typeof obj === 'string') return substituteVariablesInString(obj, sandbox)
  if (Array.isArray(obj)) return obj.map((v) => substituteVariablesInObject(v, sandbox))
  if (obj && typeof obj === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(obj)) out[k] = substituteVariablesInObject(v, sandbox)
    return out
  }
  return obj
}

function substituteVariablesInString(str: string, sandbox: any): string {
  return String(str).replace(/\{\{\$([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*)\}\}/g, (match, variablePath) => {
    try {
      const parts = String(variablePath).split('.')
      let cur: any = sandbox
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        if (i === 0) {
          const topKey = `$${p}` // e.g. $vars
          if (cur && topKey in cur) cur = cur[topKey]
          else return match
        } else {
          if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
          else return match
        }
      }
      return typeof cur === 'string' ? cur : JSON.stringify(cur)
    } catch {
      return match
    }
  })
}

// Allows JS-like objects to be parsed to JSON (e.g., unquoted keys, single quotes).
function convertToValidJSONString(inputString: string) {
  try {
    const obj = Function('return ' + inputString)()
    return JSON.stringify(obj, null, 2)
  } catch {
    return ''
  }
}

/** Accepts rich JSON describing branches and normalizes to array of {flowId,label,...} */
function normalizeFlowsFreeJson(raw: any): Array<{
  flowId: string
  label: string
  timeoutMs?: number
  apiKey?: string
  vars?: Record<string, any>
  questionTemplate?: string
}> {
  if (!raw) return []

  // Strings -> try JSON parse first
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return []
    try {
      return normalizeFlowsFreeJson(JSON.parse(s))
    } catch {
      const fixed = convertToValidJSONString(s)
      if (fixed) {
        try { return normalizeFlowsFreeJson(JSON.parse(fixed)) } catch { /* ignore */ }
      }
      return []
    }
  }

  // Array of strings (flow IDs)
  if (Array.isArray(raw) && raw.every((x) => typeof x === 'string')) {
    return (raw as string[]).map((flowId, idx) => ({
      flowId: String(flowId),
      label: String.fromCharCode(65 + idx) // A,B,C,...
    }))
  }

  // Array of objects (preferred)
  if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
    return (raw as any[]).map((b, idx) => ({
      flowId: String(b.flowId ?? b.id ?? ''),
      label: String(b.label ?? String.fromCharCode(65 + idx)),
      timeoutMs: b.timeoutMs != null ? Number(b.timeoutMs) : undefined,
      apiKey: b.apiKey != null ? String(b.apiKey) : undefined,
      vars: (b.vars && typeof b.vars === 'object') ? b.vars : undefined,
      questionTemplate: b.questionTemplate != null ? String(b.questionTemplate) : undefined
    })).filter((b) => b.flowId)
  }

  // Map object: { "A": "flowId", "B": { flowId, timeoutMs, ... } }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, any>).map(([label, val]) => {
      if (typeof val === 'string') {
        return { flowId: String(val), label: String(label) }
      }
      if (val && typeof val === 'object') {
        return {
          flowId: String(val.flowId ?? val.id ?? ''),
          label: String(val.label ?? label),
          timeoutMs: val.timeoutMs != null ? Number(val.timeoutMs) : undefined,
          apiKey: val.apiKey != null ? String(val.apiKey) : undefined,
          vars: (val.vars && typeof val.vars === 'object') ? val.vars : undefined,
          questionTemplate: val.questionTemplate != null ? String(val.questionTemplate) : undefined
        }
      }
      return { flowId: '', label: String(label) }
    }).filter((b) => b.flowId)
  }

  return []
}

/** ----- Node class (Tool) ----- */

const flowsPlaceholder = `[
  { "flowId": "1480...b584", "label": "A", "timeoutMs": 120000, "vars": { "role": "A" } },
  { "flowId": "69a9...5bc4", "label": "B", "timeoutMs": 120000, "vars": { "role": "B" } },
  { "flowId": "ed78...66c2", "label": "C", "timeoutMs": 180000, "vars": { "role": "C" } }
]
// You can also use a map:
// { "A": "1480...b584", "B": "69a9...5bc4", "C": { "flowId":"ed78...66c2", "timeoutMs": 180000 } }
//
// Supports {{$vars.someVar}} anywhere in this JSON. Example:
// { "A": { "flowId": "1480...b584", "apiKey": "{{$vars.flowKey}}" } }`

const howToUseFlows = `
This field accepts FREE JSON describing your branches. Supported shapes:
1) Array of objects:
[
  { "flowId":"...", "label":"A", "timeoutMs":120000, "apiKey":"...", "vars":{...}, "questionTemplate":"..." },
  { "flowId":"...", "label":"B" }
]
2) Array of strings (flow IDs):
["flowIdA","flowIdB","flowIdC"]
3) Map:
{
  "A": "flowIdA",
  "B": { "flowId":"flowIdB", "timeoutMs": 180000, "vars": { "role": "B" } }
}

You can embed {{$vars.NAME}} and they will be substituted from Flowise Variables at runtime.
`



class ParallelSubflows_Tool implements INode {
  label = 'Parallel Subflows'
  name = 'parallelSubflows'
  version = 1.1
  type = 'ParallelSubflows'
  icon = 'parallel.svg'
  category = 'Tools'
  description = 'Fan-out to multiple Chatflows/Agentflows in parallel, wait for all, merge results, with optional timing.'
  baseClasses = [this.type, 'Tool']
  inputs?: INodeParams[]
  outputs?: INodeParams[]

  constructor() {
    this.inputs = [
      {
        label: 'Base URL',
        name: 'baseUrl',
        type: 'string',
        default: 'http://localhost:3000/api/v1',
        description: 'Flowise API base URL.'
      },
      {
        label: 'Default API Key',
        name: 'defaultApiKey',
        type: 'string',
        placeholder: 'Optional',
        description: 'Bearer key for protected flows (overridable per branch).',
        optional: true
      },
      {
        label: 'Question Template',
        name: 'questionTemplate',
        type: 'string',
        default: '{{input}}',
        description: 'Template for the question. Supports {{input}} and {{vars.*}}.'
      },
      {
        label: 'Flows (Free JSON)',
        name: 'flowsJson',
        type: 'code',
        hideCodeExecute: true,
        placeholder: flowsPlaceholder,
        hint: { label: 'How to use', value: howToUseFlows }
      },
      {
        label: 'Max Parallel',
        name: 'maxParallel',
        type: 'number',
        default: 3,
        description: 'Cap concurrency. If N > maxParallel, the rest are queued locally.'
      },
      {
        label: 'Overall Timeout (ms)',
        name: 'overallTimeoutMs',
        type: 'number',
        default: 240000
      },
      {
        label: 'Per-Flow Fail Policy',
        name: 'failPolicy',
        type: 'options',
        options: [
          { label: 'continue (collect errors)', name: 'continue' },
          { label: 'fail-fast (cancel others)', name: 'fail-fast' }
        ],
        default: 'continue'
      },
      {
        label: 'Return Selection',
        name: 'returnSelection',
        type: 'options',
        options: [
          { label: 'text', name: 'text' },
          { label: 'json', name: 'json' },
          { label: 'full (text/json/sourceDocuments/usedTools/sessionId)', name: 'full' }
        ],
        default: 'full'
      },
      {
        label: 'Emit Timing',
        name: 'emitTiming',
        type: 'boolean',
        default: true,
        description: 'Adds total/sum/max/speedup + ASCII timeline incl. S=sum.'
      }
    ]

    this.outputs = [{ label: 'Output', name: 'output', type: 'string' }]
  }

  async init(nodeData: INodeData, _?: string, options?: ICommonObject): Promise<any> {
    const inputs = nodeData.inputs ?? {}

    const cfg: ParallelSubflowsConfig = {
      baseUrl: (inputs.baseUrl as string)?.replace(/\/+$/, '') || 'http://localhost:3000/api/v1',
      defaultApiKey: (inputs.defaultApiKey as string) || '',
      questionTemplate: (inputs.questionTemplate as string) || '{{input}}',
      flows: [],
      maxParallel: Number(inputs.maxParallel ?? 3),
      overallTimeoutMs: Number(inputs.overallTimeoutMs ?? 240000),
      failPolicy: (inputs.failPolicy as any) || 'continue',
      returnSelection: (inputs.returnSelection as any) || 'full',
      emitTiming: Boolean(inputs.emitTiming ?? true)
    }

    // Build sandbox with $vars if present
    const flowsJsonRaw = (inputs.flowsJson as string) || ''
    let sandbox: Record<string, any> = {}

    if (flowsJsonRaw.includes('$vars') && options) {
      try {
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const vars = await getVars(appDataSource, databaseEntities, nodeData, options)
        sandbox['$vars'] = prepareSandboxVars(vars)
      } catch {
        // ignore; sandbox stays empty
      }
    }

    // Substitute vars in string, allow JS-ish JSON to be parsed, then normalize
    let flowsStructured: any = flowsJsonRaw
    if (typeof flowsStructured === 'string') {
      const substituted = substituteVariablesInString(flowsStructured, sandbox)
      const jsonish = convertToValidJSONString(substituted) || substituted
      try {
        flowsStructured = JSON.parse(jsonish)
      } catch {
        // maybe it was already strict JSON and failed substitution; try raw JSON
        try { flowsStructured = JSON.parse(flowsStructured) } catch { flowsStructured = null }
      }
    } else if (flowsStructured && typeof flowsStructured === 'object') {
      flowsStructured = substituteVariablesInObject(flowsStructured, sandbox)
    }

    cfg.flows = normalizeFlowsFreeJson(flowsStructured)

    if (!cfg.flows.length) {
      throw new Error(
        'ParallelSubflows: No flows configured. Provide free JSON: ' +
        'array of {flowId,label,...}, array of flowId strings, or a map label->config.'
      )
    }

    return new ParallelSubflowsTool(cfg)
  }
}

module.exports = { nodeClass: ParallelSubflows_Tool }
