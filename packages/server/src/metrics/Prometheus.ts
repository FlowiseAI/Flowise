import { FLOWISE_METRIC_COUNTERS, IMetricsProvider } from '../Interface.Metrics'
import express from 'express'
import promClient, { Counter, Histogram, Registry } from 'prom-client'
import { getVersion } from 'flowise-components'

export class Prometheus implements IMetricsProvider {
    private app: express.Application
    private readonly register: Registry
    private counters: Map<string, promClient.Counter<string> | promClient.Gauge<string> | promClient.Histogram<string>>
    private requestCounter: Counter<string>
    private httpRequestDurationMicroseconds: Histogram<string>

    constructor(app: express.Application) {
        this.app = app
        // Clear any existing default registry metrics to avoid conflicts
        promClient.register.clear()
        // Create a separate registry for our metrics
        this.register = new promClient.Registry()
    }

    public getName(): string {
        return 'Prometheus'
    }

    async initializeCounters(): Promise<void> {
        const serviceName: string = process.env.METRICS_SERVICE_NAME || 'FlowiseAI'
        this.register.setDefaultLabels({
            app: serviceName
        })

        // look at the FLOWISE_COUNTER enum in Interface.Metrics.ts and get all values
        // for each counter in the enum, create a new promClient.Counter and add it to the registry
        this.counters = new Map<string, promClient.Counter<string> | promClient.Gauge<string> | promClient.Histogram<string>>()
        const enumEntries = Object.entries(FLOWISE_METRIC_COUNTERS)
        enumEntries.forEach(([name, value]) => {
            // derive proper counter name from the enum value (chatflow_created = Chatflow Created)
            const properCounterName: string = name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
            try {
                this.counters.set(
                    value,
                    new promClient.Counter({
                        name: value,
                        help: `Total number of ${properCounterName}`,
                        labelNames: ['status'],
                        registers: [this.register] // Explicitly set the registry
                    })
                )
            } catch (error) {
                // If metric already exists, get it from the registry instead
                const existingMetrics = this.register.getSingleMetric(value)
                if (existingMetrics) {
                    this.counters.set(value, existingMetrics as promClient.Counter<string>)
                }
            }
        })

        // in addition to the enum counters, add a few more custom counters
        // version, http_request_duration_ms, http_requests_total
        try {
            const versionGaugeCounter = new promClient.Gauge({
                name: 'flowise_version_info',
                help: 'Flowise version info.',
                labelNames: ['version'],
                registers: [this.register] // Explicitly set the registry
            })

            const { version } = await getVersion()
            versionGaugeCounter.set({ version: 'v' + version }, 1)
            this.counters.set('flowise_version', versionGaugeCounter)
        } catch (error) {
            // If metric already exists, get it from the registry
            const existingMetric = this.register.getSingleMetric('flowise_version')
            if (existingMetric) {
                this.counters.set('flowise_version', existingMetric as promClient.Gauge<string>)
            }
        }

        try {
            this.httpRequestDurationMicroseconds = new promClient.Histogram({
                name: 'http_request_duration_ms',
                help: 'Duration of HTTP requests in ms',
                labelNames: ['method', 'route', 'code'],
                buckets: [1, 5, 15, 50, 100, 200, 300, 400, 500], // buckets for response time from 0.1ms to 500ms
                registers: [this.register] // Explicitly set the registry
            })
            this.counters.set('http_request_duration_ms', this.httpRequestDurationMicroseconds)
        } catch (error) {
            // If metric already exists, get it from the registry
            const existingMetric = this.register.getSingleMetric('http_request_duration_ms')
            if (existingMetric) {
                this.httpRequestDurationMicroseconds = existingMetric as Histogram<string>
                this.counters.set('http_request_duration_ms', this.httpRequestDurationMicroseconds)
            }
        }

        try {
            this.requestCounter = new Counter({
                name: 'http_requests_total',
                help: 'Total number of HTTP requests',
                labelNames: ['method', 'path', 'status'],
                registers: [this.register] // Explicitly set the registry
            })
            this.counters.set('http_requests_total', this.requestCounter)
        } catch (error) {
            // If metric already exists, get it from the registry
            const existingMetric = this.register.getSingleMetric('http_requests_total')
            if (existingMetric) {
                this.requestCounter = existingMetric as Counter<string>
                this.counters.set('http_requests_total', this.requestCounter)
            }
        }

        // Only register metrics that aren't already in the registry
        this.registerMetrics()
        await this.setupMetricsEndpoint()
    }

    async setupMetricsEndpoint() {
        // Add Prometheus middleware to the app
        this.app.use('/api/v1/metrics', async (req, res) => {
            res.set('Content-Type', this.register.contentType)
            const currentMetrics = await this.register.metrics()
            res.send(currentMetrics).end()
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
                    this.requestCounter.inc()
                    const responseTimeInMs = Date.now() - res.locals.startEpoch
                    this.httpRequestDurationMicroseconds
                        .labels(req.method, req.baseUrl, res.statusCode.toString())
                        .observe(responseTimeInMs)
                }
            })
            next()
        })
    }

    public incrementCounter(counter: FLOWISE_METRIC_COUNTERS, payload: any) {
        // increment the counter with the payload
        if (this.counters.has(counter)) {
            ;(this.counters.get(counter) as Counter<string>).labels(payload).inc()
        }
    }

    private registerMetrics() {
        if (process.env.METRICS_INCLUDE_NODE_METRICS !== 'false') {
            // Clear any existing default metrics to avoid conflicts
            promClient.register.clear()
            // enable default metrics like CPU usage, memory usage, etc.
            // and ensure they're only registered with our custom registry
            promClient.collectDefaultMetrics({
                register: this.register,
                prefix: 'flowise_' // Add a prefix to avoid conflicts
            })
        }

        // Add only the custom metrics that haven't been registered yet
        for (const counter of this.counters.values()) {
            try {
                // Type assertion to access the name property
                const metricName = (counter as any).name
                if (!this.register.getSingleMetric(metricName)) {
                    this.register.registerMetric(counter)
                }
            } catch (error) {
                // If we can't register the metric, it probably already exists
                // Just continue with the next one
            }
        }
    }
}
