const express = require('express')
const app = express()

const port = process.env.WORKER_PORT || 5566

app.get('/healthz', (req, res) => {
    res.status(200).send('OK')
})

app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Healthcheck server listening on port ${port}`)
})
