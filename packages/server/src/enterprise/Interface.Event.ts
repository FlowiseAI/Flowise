// Websocket - Collaboration Events
export interface IEventData {
    type: string
}

export interface IJoinChatFlowEvent extends IEventData {
    type: 'JOIN_CHAT_FLOW'
    chatflowId: string
    sessionId: string
    color: string
    timestamp: number
}

export interface ILeaveChatFlowEvent extends IEventData {
    type: 'LEAVE_CHAT_FLOW'
    chatflowId: string
    sessionId: string
}

export interface IUserColorUpdatedEvent extends IEventData {
    type: 'USER_COLOR_UPDATED'
    chatflowId: string
    sessionId: string
    color: string
}

export interface IUserHeartbeatEvent extends IEventData {
    type: 'USER_HEARTBEAT'
    chatflowId: string
    sessionId: string
    status: 'active' | 'idle' | 'away'
    timestamp: number
}

export interface IRequestSnapshotSyncEvent extends IEventData {
    type: 'REQUEST_SNAPSHOT_SYNC'
    chatflowId: string
}

export interface INodeUpdatedEvent extends IEventData {
    type: 'NODE_UPDATED'
    chatflowId: string
    timestamp: number
    changeType: 'add' | 'remove' | 'update' | 'position' | 'dimensions' | 'select'
    nodeId: string
    node: Record<string, any>
    edge?: Record<string, any>
}

export interface IEdgeUpdatedEvent extends IEventData {
    type: 'EDGE_UPDATED'
    chatflowId: string
    timestamp: number
    changeType: 'add' | 'remove' | 'buttonedge'
    edgeId: string
    edge: Record<string, any>
    node?: Record<string, any>
}

export interface ICursorMovedEvent extends IEventData {
    type: 'CURSOR_MOVED'
    chatflowId: string
    sessionId: string
    name: string
    color: string
    x: number
    y: number
}

export interface INodePresenceUpdatedEvent extends IEventData {
    type: 'NODE_PRESENCE_UPDATED'
    chatflowId: string
    sessionId: string
    nodeId: string
    action: 'enter' | 'leave' | 'edit_start' | 'edit_end'
}

export type IEvent =
    | IJoinChatFlowEvent
    | ILeaveChatFlowEvent
    | IUserColorUpdatedEvent
    | IUserHeartbeatEvent
    | IRequestSnapshotSyncEvent
    | INodeUpdatedEvent
    | IEdgeUpdatedEvent
    | ICursorMovedEvent
    | INodePresenceUpdatedEvent
