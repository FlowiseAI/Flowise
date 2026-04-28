import { INodeParams, INodeCredential } from '../src/Interface'

const VENDOR_PRESETS: Record<string, { endpoint: string; protocol: string; headerKey: string; headerValueHint: string }> = {
    newrelic: {
        endpoint: 'https://otlp.nr-data.net:4318/v1/traces',
        protocol: 'http/protobuf',
        headerKey: 'api-key',
        headerValueHint: 'your-new-relic-ingest-key'
    },
    datadog: {
        endpoint: 'http://your-datadog-agent-host:4318/v1/traces',
        protocol: 'http/protobuf',
        headerKey: 'dd-api-key',
        headerValueHint: 'your-datadog-api-key'
    },
    logicmonitor: {
        endpoint: 'https://your-account.logicmonitor.com/rest/api/v1/traces',
        protocol: 'http/protobuf',
        headerKey: 'Authorization',
        headerValueHint: 'Bearer your-logicmonitor-bearer-token'
    },
    grafana: {
        endpoint: 'https://otlp-gateway-prod-us-east-0.grafana.net/otlp/v1/traces',
        protocol: 'http/protobuf',
        headerKey: 'Authorization',
        headerValueHint: 'Basic your-base64-encoded-instance-id-and-api-token'
    }
}

class OpenTelemetryApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenTelemetry API'
        this.name = 'openTelemetryApi'
        this.version = 1.0
        this.description =
            'Export telemetry data to OpenTelemetry compatible backends. ' +
            'Select a Vendor Preset to auto-fill recommended defaults, or choose Custom for any OTLP-compliant endpoint.'
        this.inputs = [
            {
                label: 'Vendor Preset',
                name: 'otelVendorPreset',
                type: 'options',
                options: [
                    { label: 'Custom', name: 'custom' },
                    { label: 'New Relic', name: 'newrelic' },
                    { label: 'Datadog', name: 'datadog' },
                    { label: 'LogicMonitor', name: 'logicmonitor' },
                    { label: 'Grafana Cloud', name: 'grafana' }
                ],
                default: 'custom',
                autoPopulate: {
                    newrelic: {
                        otelEndpoint: VENDOR_PRESETS.newrelic.endpoint,
                        otelProtocol: VENDOR_PRESETS.newrelic.protocol,
                        otelHeaderKey: VENDOR_PRESETS.newrelic.headerKey,
                        otelHeaderValue: VENDOR_PRESETS.newrelic.headerValueHint
                    },
                    datadog: {
                        otelEndpoint: VENDOR_PRESETS.datadog.endpoint,
                        otelProtocol: VENDOR_PRESETS.datadog.protocol,
                        otelHeaderKey: VENDOR_PRESETS.datadog.headerKey,
                        otelHeaderValue: VENDOR_PRESETS.datadog.headerValueHint
                    },
                    logicmonitor: {
                        otelEndpoint: VENDOR_PRESETS.logicmonitor.endpoint,
                        otelProtocol: VENDOR_PRESETS.logicmonitor.protocol,
                        otelHeaderKey: VENDOR_PRESETS.logicmonitor.headerKey,
                        otelHeaderValue: VENDOR_PRESETS.logicmonitor.headerValueHint
                    },
                    grafana: {
                        otelEndpoint: VENDOR_PRESETS.grafana.endpoint,
                        otelProtocol: VENDOR_PRESETS.grafana.protocol,
                        otelHeaderKey: VENDOR_PRESETS.grafana.headerKey,
                        otelHeaderValue: VENDOR_PRESETS.grafana.headerValueHint
                    }
                }
            },
            {
                label: 'Endpoint',
                name: 'otelEndpoint',
                type: 'string',
                placeholder: 'https://otlp.nr-data.net:4318/v1/traces',
                description:
                    'Full OTLP traces endpoint URL. When a vendor preset is selected, adjust vendor-specific parts as needed ' +
                    '(e.g. the Datadog Agent host, your LogicMonitor account subdomain, or your Grafana Cloud region).'
            },
            {
                label: 'Protocol',
                name: 'otelProtocol',
                type: 'options',
                options: [
                    {
                        label: 'HTTP/Protobuf',
                        name: 'http/protobuf'
                    },
                    {
                        label: 'gRPC',
                        name: 'grpc'
                    }
                ],
                default: 'http/protobuf'
            },
            {
                label: 'Header Key',
                name: 'otelHeaderKey',
                type: 'string',
                optional: true,
                placeholder: 'api-key',
                description: 'The header name for authentication (e.g. api-key, Authorization, dd-api-key).'
            },
            {
                label: 'Header Value',
                name: 'otelHeaderValue',
                type: 'password',
                optional: true,
                placeholder: 'your-api-key-value',
                description: 'The header value (typically an API key or token). Masked in the UI and encrypted before storage.'
            },
            {
                label: 'Service Name',
                name: 'otelServiceName',
                type: 'string',
                optional: true,
                default: 'flowise'
            },
            {
                label: 'Environment',
                name: 'otelEnvironment',
                type: 'string',
                optional: true,
                additionalParams: true,
                default: 'production'
            },
            {
                label: 'Sampling Rate',
                name: 'otelSamplingRate',
                type: 'number',
                optional: true,
                additionalParams: true,
                default: 1.0,
                description: 'Value between 0.0 and 1.0, where 1.0 means 100% of traces are sampled.'
            },
            {
                label: 'Max Queue Size',
                name: 'otelMaxQueueSize',
                type: 'number',
                optional: true,
                additionalParams: true,
                default: 2048,
                description: 'Maximum number of spans in the export queue.'
            },
            {
                label: 'Schedule Delay (ms)',
                name: 'otelScheduleDelayMs',
                type: 'number',
                optional: true,
                additionalParams: true,
                default: 5000,
                description: 'Delay interval in milliseconds between two consecutive exports.'
            },
            {
                label: 'Max Export Batch Size',
                name: 'otelMaxExportBatchSize',
                type: 'number',
                optional: true,
                additionalParams: true,
                default: 512,
                description: 'Maximum number of spans exported in a single batch.'
            },
            {
                label: 'Export Timeout (ms)',
                name: 'otelExportTimeoutMs',
                type: 'number',
                optional: true,
                additionalParams: true,
                default: 30000,
                description: 'How long the export can run before it is cancelled.'
            },
            {
                label: 'TLS Insecure',
                name: 'otelTlsInsecure',
                type: 'boolean',
                optional: true,
                additionalParams: true,
                default: false,
                description: 'Bypass TLS certificate validation (for development only, not recommended for production).'
            }
        ]
    }
}

module.exports = { credClass: OpenTelemetryApi }
