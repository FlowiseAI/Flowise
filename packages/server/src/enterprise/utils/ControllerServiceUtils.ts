import { Equal } from 'typeorm'
import { Request } from 'express'

export const getWorkspaceSearchOptions = (workspaceId?: string) => {
    return workspaceId ? { workspaceId: Equal(workspaceId) } : {}
}

export const getWorkspaceSearchOptionsFromReq = (req: Request) => {
    const workspaceId = req.user?.activeWorkspaceId
    return workspaceId ? { workspaceId: Equal(workspaceId) } : {}
}
