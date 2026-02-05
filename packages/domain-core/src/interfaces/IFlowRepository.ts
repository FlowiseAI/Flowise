/**
 * Flow Node - represents a node in the flow graph
 */
export interface FlowNode {
    id: string
    type: string
    position: { x: number; y: number }
    data: Record<string, unknown>
    /** Additional node properties */
    [key: string]: unknown
}

/**
 * Flow Edge - represents a connection between nodes
 */
export interface FlowEdge {
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
    /** Additional edge properties */
    [key: string]: unknown
}

/**
 * Flow Data - contains the graph structure
 */
export interface FlowData {
    nodes: FlowNode[]
    edges: FlowEdge[]
}

/**
 * Flow Entity
 * Represents an agentflow or chatflow in the system
 */
export interface Flow {
    id: string
    name: string
    flowData: FlowData
    deployed?: boolean
    isPublic?: boolean
    apikeyid?: string | null
    chatbotConfig?: Record<string, unknown>
    createdDate?: Date
    updatedDate?: Date
    type?: string
    /** Extension point for custom properties */
    metadata?: Record<string, unknown>
}

/**
 * Options for flow repository operations
 */
export interface FlowFindOptions {
    /** Tenant identifier for multi-tenant queries */
    tenantId?: string
    /** Whether to look up from draft storage */
    isDraft?: boolean
    /** Additional options for implementation-specific needs */
    [key: string]: unknown
}

/**
 * Flow Repository Interface
 *
 * Defines the contract for persisting and retrieving flows (agentflows/chatflows).
 * Implementations can use SQL databases, cloud storage, or JSON files.
 *
 * @example
 * ```typescript
 * class MyFlowRepository implements IFlowRepository {
 *   async findById(id: string, options?: FlowFindOptions): Promise<Flow | null> {
 *     if (options?.isDraft) {
 *       return await this.draftStorage.get(id)
 *     }
 *     return await this.primaryStorage.get(id)
 *   }
 * }
 * ```
 */
export interface IFlowRepository {
    /**
     * Find flow by ID
     *
     * @param id - Flow identifier
     * @param options - Optional context (tenantId, isDraft, etc.)
     * @returns Flow if found, null otherwise
     */
    findById(id: string, options?: FlowFindOptions): Promise<Flow | null>

    /**
     * Find all flows for an organization
     *
     * @param orgId - Organization identifier
     * @returns Array of flows
     */
    findByOrganization(orgId: string): Promise<Flow[]>

    /**
     * Save flow
     *
     * @param flow - Flow to save
     * @returns Saved flow
     */
    save(flow: Flow): Promise<Flow>

    /**
     * Delete flow
     *
     * @param id - Flow identifier
     */
    delete(id: string): Promise<void>

    /**
     * Optional: Find all flows
     *
     * @returns Array of all flows
     */
    findAll?(): Promise<Flow[]>
}
