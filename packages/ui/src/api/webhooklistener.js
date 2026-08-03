import client from './client'

const register = (chatflowid) => client.post(`/webhook-listener/${chatflowid}/register`)
const unregister = (chatflowid, listenerId) => client.delete(`/webhook-listener/${chatflowid}/listener/${listenerId}`)

export default { register, unregister }
