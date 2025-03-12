import { FLOWISE_METRIC_COUNTERS, IMetricsProvider } from '../Interface.Metrics'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { MeterProvider, PeriodicExportingMetricReader, Histogram } from '@opentelemetry/sdk-metrics'
import { diag, DiagLogLevel, DiagConsoleLogger, Attributes, Counter } from '@opentelemetry/api'
import { getVersion } from 'flowise-components'
import express from 'express'

export class OpenTelemetry implements IMetricsProvider {
    private app: express.Application
    private resource: Resource
    private otlpMetricExporter: any
    // private otlpTraceExporter: any
    // private tracerProvider: NodeTracerProvider
    private metricReader: PeriodicExportingMetricReader
    private meterProvider: MeterProvider

    // Map to hold all counters and histograms
    private counters = new Map<string, Counter | Histogram>()
    private httpRequestCounter: Counter
    private httpRequestDuration: any

    constructor(app: express.Application) {
        this.app = app

        if (!process.env.METRICS_OPEN_TELEMETRY_METRIC_ENDPOINT) {
            throw new Error('METRICS_OPEN_TELEMETRY_METRIC_ENDPOINT is not defined')
        }

        if (process.env.METRICS_OPEN_TELEMETRY_DEBUG === 'true') {
            diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)
        }
    }

    public getName(): string {
        return 'OpenTelemetry'
    }

    async initializeCounters(): Promise<void> {
        // Define the resource with the service name for trace grouping
        const flowiseVersion = await getVersion()

        this.resource = new Resource({
            [ATTR_SERVICE_NAME]: process.env.METRICS_SERVICE_NAME || 'FlowiseAI',
            [ATTR_SERVICE_VERSION]: flowiseVersion.version // Version as a label
        })

        const metricProtocol = process.env.METRICS_OPEN_TELEMETRY_PROTOCOL || 'http' // Default to 'http'
        // Conditionally import the correct OTLP exporters based on protocol
        let OTLPMetricExporter
        if (metricProtocol === 'http') {
            OTLPMetricExporter = require('@opentelemetry/exporter-metrics-otlp-http').OTLPMetricExporter
        } else if (metricProtocol === 'grpc') {
            OTLPMetricExporter = require('@opentelemetry/exporter-metrics-otlp-grpc').OTLPMetricExporter
        } else if (metricProtocol === 'proto') {
            OTLPMetricExporter = require('@opentelemetry/exporter-metrics-otlp-proto').OTLPMetricExporter
        } else {
            console.error('Invalid METRICS_OPEN_TELEMETRY_PROTOCOL specified. Please set it to "http", "grpc", or "proto".')
            process.exit(1) // Exit if invalid protocol type is specified
        }

        this.otlpMetricExporter = new OTLPMetricExporter({
            url: process.env.METRICS_OPEN_TELEMETRY_METRIC_ENDPOINT // OTLP endpoint for metrics
        })

        this.metricReader = new PeriodicExportingMetricReader({
            exporter: this.otlpMetricExporter,
            exportIntervalMillis: 5000 // Export metrics every 5 seconds
        })
        this.meterProvider = new MeterProvider({ resource: this.resource, readers: [this.metricReader] })

        const meter = this.meterProvider.getMeter('flowise-metrics')
        // look at the FLOWISE_COUNTER enum in Interface.Metrics.ts and get all values
        // for each counter in the enum, create a new promClient.Counter and add it to the registry
        const enumEntries = Object.entries(FLOWISE_METRIC_COUNTERS)
        enumEntries.forEach(([name, value]) => {
            // derive proper counter name from the enum value (chatflow_created = Chatflow Created)
            const properCounterName: string = name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
            this.counters.set(
                value,
                meter.createCounter(value, {
                    description: properCounterName
                })
            )
        })

        // in addition to the enum counters, add a few more custom counters

        const versionGuage = meter.createGauge('flowise_version', {
            description: 'Flowise version'
        })
        // remove the last dot from the version string, e.g. 2.1.3 -> 2.13 (guage needs a number - float)
        const formattedVersion = flowiseVersion.version.replace(/\.(\d+)$/, '$1')
        versionGuage.record(parseFloat(formattedVersion))

        // Counter for HTTP requests with method, path, and status as labels
        this.httpRequestCounter = meter.createCounter('http_requests_total', {
            description: 'Counts the number of HTTP requests received'
        })

        // Histogram to measure HTTP request duration in milliseconds
        this.httpRequestDuration = meter.createHistogram('http_request_duration_ms', {
            description: 'Records the duration of HTTP requests in ms'
        })
    }

    // Function to record HTTP request duration
    private recordHttpRequestDuration(durationMs: number, method: string, path: string, status: number) {
        this.httpRequestDuration.record(durationMs, {
            method,
            path,
            status: status.toString()
        })
    }

    // Function to record HTTP requests with specific labels
    private recordHttpRequest(method: string, path: string, status: number) {
        this.httpRequestCounter.add(1, {
            method,
            path,
            status: status.toString()
        })
    }

    async setupMetricsEndpoint(): Promise<void> {
        // Graceful shutdown for telemetry data flushing
        process.on('SIGTERM', async () => {
            await this.metricReader.shutdown()
            await this.meterProvider.shutdown()
        })

        // Runs before each requests
        this.app.use((req, res, next) => {
            res.locals.startEpoch = Date.now()
            next()
        })

        // Runs after each requests
        this.app.use((req, res, next) => {
            res.on('finish', async () => {
                if (res.locals.startEpoch) {
                    const responseTimeInMs = Date.now() - res.locals.startEpoch
                    this.recordHttpRequest(req.method, req.path, res.statusCode)
                    this.recordHttpRequestDuration(responseTimeInMs, req.method, req.path, res.statusCode)
                }
            })
            next()
        })
    }

    async incrementCounter(counter: string, payload: any): Promise<void> {
        // Increment OpenTelemetry counter with the payload
        if (this.counters.has(counter)) {
            ;(this.counters.get(counter) as Counter<Attributes>).add(1, payload)
        }
    }
}
