import { FLOWISE_METRIC_COUNTERS, IMetricsProvider } from '../Interface.Metrics'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { MeterProvider, PeriodicExportingMetricReader, Histogram } from '@opentelemetry/sdk-metrics'
import { diag, DiagLogLevel, DiagConsoleLogger, Attributes, Counter } from '@opentelemetry/api'
import { getVersion } from 'flowise-components'
import express from 'express'

// Create a static map to track created metrics and prevent duplicates
const createdMetrics = new Map<string, boolean>()

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

        // Clear metrics tracking on new instance
        createdMetrics.clear()
    }

    public getName(): string {
        return 'OpenTelemetry'
    }

    async initializeCounters(): Promise<void> {
        try {
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

            // Handle any existing metric exporter
            if (this.otlpMetricExporter) {
                try {
                    await this.otlpMetricExporter.shutdown()
                } catch (error) {
                    // Ignore shutdown errors
                }
            }

            this.otlpMetricExporter = new OTLPMetricExporter({
                url: process.env.METRICS_OPEN_TELEMETRY_METRIC_ENDPOINT // OTLP endpoint for metrics
            })

            // Clean up any existing metric reader
            if (this.metricReader) {
                try {
                    await this.metricReader.shutdown()
                } catch (error) {
                    // Ignore shutdown errors
                }
            }

            this.metricReader = new PeriodicExportingMetricReader({
                exporter: this.otlpMetricExporter,
                exportIntervalMillis: 5000 // Export metrics every 5 seconds
            })

            // Clean up any existing meter provider
            if (this.meterProvider) {
                try {
                    await this.meterProvider.shutdown()
                } catch (error) {
                    // Ignore shutdown errors
                }
            }

            this.meterProvider = new MeterProvider({ resource: this.resource, readers: [this.metricReader] })

            const meter = this.meterProvider.getMeter('flowise-metrics')
            // look at the FLOWISE_COUNTER enum in Interface.Metrics.ts and get all values
            // for each counter in the enum, create a new promClient.Counter and add it to the registry
            const enumEntries = Object.entries(FLOWISE_METRIC_COUNTERS)
            enumEntries.forEach(([name, value]) => {
                try {
                    // Check if we've already created this metric
                    if (!createdMetrics.has(value)) {
                        // derive proper counter name from the enum value (chatflow_created = Chatflow Created)
                        const properCounterName: string = name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                        this.counters.set(
                            value,
                            meter.createCounter(value, {
                                description: properCounterName
                            })
                        )
                        createdMetrics.set(value, true)
                    }
                } catch (error) {
                    // Log error but continue with other metrics
                    console.error(`Error creating metric ${value}:`, error)
                }
            })

            try {
                // Add version gauge if not already created
                if (!createdMetrics.has('flowise_version')) {
                    const versionGuage = meter.createGauge('flowise_version', {
                        description: 'Flowise version'
                    })
                    // remove the last dot from the version string, e.g. 2.1.3 -> 2.13 (gauge needs a number - float)
                    const formattedVersion = flowiseVersion.version.replace(/\.(\d+)$/, '$1')
                    versionGuage.record(parseFloat(formattedVersion))
                    createdMetrics.set('flowise_version', true)
                }
            } catch (error) {
                console.error('Error creating version gauge:', error)
            }

            try {
                // HTTP requests counter
                if (!createdMetrics.has('http_requests_total')) {
                    this.httpRequestCounter = meter.createCounter('http_requests_total', {
                        description: 'Counts the number of HTTP requests received'
                    })
                    createdMetrics.set('http_requests_total', true)
                }
            } catch (error) {
                console.error('Error creating HTTP request counter:', error)
            }

            try {
                // HTTP request duration histogram
                if (!createdMetrics.has('http_request_duration_ms')) {
                    this.httpRequestDuration = meter.createHistogram('http_request_duration_ms', {
                        description: 'Records the duration of HTTP requests in ms'
                    })
                    createdMetrics.set('http_request_duration_ms', true)
                }
            } catch (error) {
                console.error('Error creating HTTP request duration histogram:', error)
            }

            await this.setupMetricsEndpoint()
        } catch (error) {
            console.error('Error initializing OpenTelemetry metrics:', error)
            // Don't throw - allow app to continue without metrics
        }
    }

    // Function to record HTTP request duration
    private recordHttpRequestDuration(durationMs: number, method: string, path: string, status: number) {
        try {
            if (this.httpRequestDuration) {
                this.httpRequestDuration.record(durationMs, {
                    method,
                    path,
                    status: status.toString()
                })
            }
        } catch (error) {
            // Log error but don't crash the application
            console.error('Error recording HTTP request duration:', error)
        }
    }

    // Function to record HTTP requests with specific labels
    private recordHttpRequest(method: string, path: string, status: number) {
        try {
            if (this.httpRequestCounter) {
                this.httpRequestCounter.add(1, {
                    method,
                    path,
                    status: status.toString()
                })
            }
        } catch (error) {
            // Log error but don't crash the application
            console.error('Error recording HTTP request:', error)
        }
    }

    async setupMetricsEndpoint(): Promise<void> {
        try {
            // Graceful shutdown for telemetry data flushing
            process.on('SIGTERM', async () => {
                try {
                    if (this.metricReader) await this.metricReader.shutdown()
                    if (this.meterProvider) await this.meterProvider.shutdown()
                } catch (error) {
                    console.error('Error during metrics shutdown:', error)
                }
            })

            // Runs before each requests
            this.app.use((req, res, next) => {
                res.locals.startEpoch = Date.now()
                next()
            })

            // Runs after each requests
            this.app.use((req, res, next) => {
                res.on('finish', async () => {
                    try {
                        if (res.locals.startEpoch) {
                            const responseTimeInMs = Date.now() - res.locals.startEpoch
                            this.recordHttpRequest(req.method, req.path, res.statusCode)
                            this.recordHttpRequestDuration(responseTimeInMs, req.method, req.path, res.statusCode)
                        }
                    } catch (error) {
                        console.error('Error in metrics middleware:', error)
                    }
                })
                next()
            })
        } catch (error) {
            console.error('Error setting up metrics endpoint:', error)
        }
    }

    async incrementCounter(counter: string, payload: any): Promise<void> {
        try {
            // Increment OpenTelemetry counter with the payload
            if (this.counters.has(counter)) {
                ;(this.counters.get(counter) as Counter<Attributes>).add(1, payload)
            }
        } catch (error) {
            console.error(`Error incrementing counter ${counter}:`, error)
        }
    }
}
