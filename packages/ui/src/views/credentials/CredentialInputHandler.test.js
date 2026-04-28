jest.mock('@mui/material', () => ({
    Box: 'Box',
    Typography: 'Typography',
    IconButton: 'IconButton'
}))
jest.mock('@tabler/icons-react', () => ({
    IconArrowsMaximize: 'IconArrowsMaximize',
    IconAlertTriangle: 'IconAlertTriangle'
}))
jest.mock('@/ui-component/dropdown/Dropdown', () => ({ Dropdown: () => null }))
jest.mock('@/ui-component/input/Input', () => ({ Input: () => null }))
jest.mock('@/ui-component/switch/Switch', () => ({ SwitchInput: () => null }))
jest.mock('@/ui-component/json/JsonEditor', () => ({ JsonEditorInput: () => null }))
jest.mock('@/ui-component/tooltip/TooltipWithParser', () => ({ TooltipWithParser: () => null }))

import { applyCredentialOptionSelection } from './CredentialInputHandler'

const vendorPresetInput = {
    name: 'otelVendorPreset',
    autoPopulate: {
        newrelic: {
            otelEndpoint: 'https://otlp.nr-data.net:4318/v1/traces',
            otelProtocol: 'http/protobuf',
            otelHeaderKey: 'api-key',
            otelHeaderValue: 'your-new-relic-ingest-key'
        },
        datadog: {
            otelEndpoint: 'http://your-datadog-agent-host:4318/v1/traces',
            otelProtocol: 'http/protobuf',
            otelHeaderKey: 'dd-api-key',
            otelHeaderValue: 'your-datadog-api-key'
        },
        logicmonitor: {
            otelEndpoint: 'https://your-account.logicmonitor.com/rest/api/v1/traces',
            otelProtocol: 'http/protobuf',
            otelHeaderKey: 'Authorization',
            otelHeaderValue: 'Bearer your-logicmonitor-bearer-token'
        },
        grafana: {
            otelEndpoint: 'https://otlp-gateway-prod-us-east-0.grafana.net/otlp/v1/traces',
            otelProtocol: 'http/protobuf',
            otelHeaderKey: 'Authorization',
            otelHeaderValue: 'Basic your-base64-encoded-instance-id-and-api-token'
        }
    }
}

describe('applyCredentialOptionSelection', () => {
    Object.entries(vendorPresetInput.autoPopulate).forEach(([vendor, preset]) => {
        it(`auto-populates OpenTelemetry credential fields for ${vendor}`, () => {
            const data = { otelVendorPreset: 'custom' }
            const onDataChange = jest.fn()

            applyCredentialOptionSelection(vendorPresetInput, data, vendor, onDataChange)

            expect(data).toEqual({
                otelVendorPreset: vendor,
                ...preset
            })
            expect(onDataChange).toHaveBeenCalledWith({
                otelVendorPreset: vendor,
                ...preset
            })
            expect(onDataChange.mock.calls[0][0]).not.toBe(data)
        })
    })

    it('does not auto-populate fields for Custom', () => {
        const data = {
            otelVendorPreset: 'newrelic',
            otelEndpoint: 'https://existing.example.com/v1/traces',
            otelProtocol: 'grpc',
            otelHeaderKey: 'existing-header',
            otelHeaderValue: 'existing-value'
        }
        const onDataChange = jest.fn()

        applyCredentialOptionSelection(vendorPresetInput, data, 'custom', onDataChange)

        expect(data).toEqual({
            otelVendorPreset: 'custom',
            otelEndpoint: 'https://existing.example.com/v1/traces',
            otelProtocol: 'grpc',
            otelHeaderKey: 'existing-header',
            otelHeaderValue: 'existing-value'
        })
        expect(onDataChange).not.toHaveBeenCalled()
    })
})
