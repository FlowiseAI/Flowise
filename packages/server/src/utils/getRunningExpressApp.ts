import * as Server from '../index'

export const getRunningExpressApp = function () {
    const runningExpressInstance = Server.getInstance()
    if (
        typeof runningExpressInstance === 'undefined' ||
        typeof runningExpressInstance.nodesPool === 'undefined' ||
        typeof runningExpressInstance.telemetry === 'undefined'
    ) {
        throw new Error(`Error: getRunningExpressApp failed!`)
    }
    return runningExpressInstance
}
