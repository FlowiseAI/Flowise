import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

//@ts-ignore
const createEvent = async (eventInfo) => {
    const flowXpresApp = getRunningExpressApp()
    await flowXpresApp.telemetry.sendTelemetry(eventInfo.name, eventInfo.data)
}

export default {
    createEvent
}
