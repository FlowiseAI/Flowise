import * as Server from '../src'
import { getRunningExpressApp } from '../src/utils/getRunningExpressApp'
import { organizationUserRouteTest } from './routes/v1/organization-user.route.test'
import { userRouteTest } from './routes/v1/user.route.test'
import { apiKeyTest } from './utils/api-key.util.test'

// ⏱️ Extend test timeout to 6 minutes for long setups (increase as tests grow)
jest.setTimeout(360000)

beforeAll(async () => {
    await Server.start()

    // ⏳ Wait 3 minutes for full server and database init (esp. on lower end hardware)
    await new Promise((resolve) => setTimeout(resolve, 3 * 60 * 1000))
})

afterAll(async () => {
    await getRunningExpressApp().stopApp()
})

describe('Routes Test', () => {
    userRouteTest()
    organizationUserRouteTest()
})

describe('Utils Test', () => {
    apiKeyTest()
})
