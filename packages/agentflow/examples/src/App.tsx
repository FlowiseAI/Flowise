/**
 * Example App with Dropdown Selector
 *
 * Select different examples from the dropdown to see various SDK usage patterns.
 */

import { type ComponentType, lazy, Suspense, useState } from 'react'

import { apiBaseUrl, token } from './config'
import {
    AllNodeTypesExampleProps,
    BasicExampleProps,
    CustomUIExampleProps,
    DarkModeExampleProps,
    FilteredComponentsExampleProps,
    MultiNodeFlowProps,
    StatusIndicatorsExampleProps
} from './demos'
import { PropsDisplay } from './PropsDisplay'

const examples: Array<{
    id: string
    name: string
    description: string
    props: object
    component: ComponentType
}> = [
    {
        id: 'basic',
        name: 'Basic Usage',
        description: 'Simple canvas with imperative methods',
        props: BasicExampleProps,
        component: lazy(() => import('./demos/BasicExample').then((m) => ({ default: m.BasicExample })))
    },
    {
        id: 'multi-node',
        name: 'Multi-Node Flow',
        description: 'Complete flow with gradient edges',
        props: MultiNodeFlowProps,
        component: lazy(() => import('./demos/MultiNodeFlow').then((m) => ({ default: m.MultiNodeFlow })))
    },
    {
        id: 'dark-mode',
        name: 'Dark Mode',
        description: 'Light/dark theme toggle',
        props: DarkModeExampleProps,
        component: lazy(() => import('./demos/DarkModeExample').then((m) => ({ default: m.DarkModeExample })))
    },
    {
        id: 'status',
        name: 'Status Indicators',
        description: 'Node execution states with animations',
        props: StatusIndicatorsExampleProps,
        component: lazy(() => import('./demos/StatusIndicatorsExample').then((m) => ({ default: m.StatusIndicatorsExample })))
    },
    {
        id: 'custom-ui',
        name: 'Custom UI',
        description: 'Custom header and palette via render props',
        props: CustomUIExampleProps,
        component: lazy(() => import('./demos/CustomUIExample').then((m) => ({ default: m.CustomUIExample })))
    },
    {
        id: 'all-nodes',
        name: 'All Node Types',
        description: 'Visual catalog of all 15 node types',
        props: AllNodeTypesExampleProps,
        component: lazy(() => import('./demos/AllNodeTypesExample').then((m) => ({ default: m.AllNodeTypesExample })))
    },
    {
        id: 'filtered',
        name: 'Filtered Components',
        description: 'Restrict available nodes with presets',
        props: FilteredComponentsExampleProps,
        component: lazy(() => import('./demos/FilteredComponentsExample').then((m) => ({ default: m.FilteredComponentsExample })))
    }
]

type ExampleId = (typeof examples)[number]['id']
function isExampleId(id: string): id is ExampleId {
    return examples.some((e) => e.id === id)
}

function LoadingFallback() {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#666',
                fontSize: '14px'
            }}
        >
            Loading example...
        </div>
    )
}

export default function App() {
    const [selectedExample, setSelectedExample] = useState<ExampleId>('basic')
    const [showProps, setShowProps] = useState(true)
    // Config loaded from environment variables

    const currentExample = examples.find((e) => e.id === selectedExample)

    // Replace placeholder values with actual runtime values
    const actualProps = currentExample?.props
        ? Object.fromEntries(
              Object.entries(currentExample.props).map(([key, value]) => {
                  if (key === 'apiBaseUrl' && typeof value === 'string' && value.includes('environment variables')) {
                      return [key, apiBaseUrl]
                  }
                  if (key === 'token' && typeof value === 'string' && value.includes('environment variables')) {
                      return [key, token ? `${token.substring(0, 20)}...` : 'undefined']
                  }
                  return [key, value]
              })
          )
        : {}

    const Component = currentExample?.component

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Example Selector Header */}
            <div
                style={{
                    padding: '12px 16px',
                    background: '#fff',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexShrink: 0
                }}
            >
                <label htmlFor='example-select' style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>
                    Example:
                </label>
                <select
                    id='example-select'
                    value={selectedExample}
                    onChange={(e) => {
                        const value = e.target.value
                        if (isExampleId(value)) setSelectedExample(value)
                    }}
                    style={{
                        padding: '8px 12px',
                        fontSize: '14px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        background: '#fff',
                        cursor: 'pointer',
                        minWidth: '200px'
                    }}
                >
                    {examples.map((example) => (
                        <option key={example.id} value={example.id}>
                            {example.name}
                        </option>
                    ))}
                </select>
                {currentExample && <span style={{ color: '#666', fontSize: '13px' }}>{currentExample.description}</span>}

                {/* API Base URL Display */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#999' }}>{apiBaseUrl}</span>
                </div>
            </div>

            {/* Props Display Section */}
            {currentExample && actualProps && (
                <PropsDisplay
                    exampleName={currentExample.name}
                    props={actualProps as Record<string, string | boolean>}
                    exampleId={selectedExample}
                    showProps={showProps}
                    onToggleProps={setShowProps}
                />
            )}

            {/* Example Content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <Suspense fallback={<LoadingFallback />}>{Component ? <Component /> : null}</Suspense>
            </div>
        </div>
    )
}
