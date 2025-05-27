import express from 'express'
import promClient, { Counter } from 'prom-client'

export const initializePrometheus = (app: express.Application) => {
    const register = new promClient.Registry()
    register.setDefaultLabels({
        app: 'FlowiseAI'
    })

    const predictionsTotal = new promClient.Counter({
        name: 'checkouts_total',
        help: 'Total number of checkouts',
        labelNames: ['payment_method']
    })

    const requestCounter = new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'path', 'status']
    })

    app.use('/api/v1/prediction', async (req, res) => {
        res.on('finish', async () => {
            requestCounter.labels(req?.method, req?.path, res.statusCode.toString()).inc()
            predictionsTotal.labels('success').inc()
        })
    })

    // enable default metrics like CPU usage, memory usage, etc.
    promClient.collectDefaultMetrics({ register })
    // Add our custom metric to the registry
    register.registerMetric(requestCounter)
    register.registerMetric(predictionsTotal)

    // Add Prometheus middleware to the app
    app.use('/api/v1/metrics', async (req, res) => {
        res.set('Content-Type', register.contentType)
        const currentMetrics = await register.metrics()
        res.send(currentMetrics)
    })

    const httpRequestDurationMicroseconds = new promClient.Histogram({
        name: 'http_request_duration_ms',
        help: 'Duration of HTTP requests in ms',
        labelNames: ['method', 'route', 'code'],
        buckets: [1, 5, 15, 50, 100, 200, 300, 400, 500] // buckets for response time from 0.1ms to 500ms
    })
    register.registerMetric(httpRequestDurationMicroseconds)

    // Runs before each requests
    app.use((req, res, next) => {
        res.locals.startEpoch = Date.now()
        next()
    })

    // Runs after each requests
    app.use((req, res, next) => {
        res.on('finish', async () => {
            requestCounter.inc()
            const responseTimeInMs = Date.now() - res.locals.startEpoch
            httpRequestDurationMicroseconds.labels(req.method, req?.route?.path, res.statusCode.toString()).observe(responseTimeInMs)
        })
        next()
    })
}
