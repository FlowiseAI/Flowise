import express, { Request, Response } from 'express'
//@ts-ignore
import swaggerUi from 'swagger-ui-express'
import { swaggerDocs, swaggerExplorerOptions } from './configs/swagger.config'

const app = express()
const port = 6655

app.get('/', (req: Request, res: Response) => {
    res.redirect('/api-docs')
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerExplorerOptions))

app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Flowise API documentation server listening on port ${port}`)
})
