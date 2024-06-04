import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const createEvent = async (eventInfo: any) => {
    const appServer = getRunningExpressApp()
    await appServer.telemetry.sendTelemetry(eventInfo.name, eventInfo.data)
}

export default {
    createEvent
}
