import { INode, INodeParams } from '../../src/Interface'

/**
 * Base class for private nodes that ensures proper labeling convention
 * by automatically prefixing node labels with 'private_' when necessary.
 */
export abstract class PrivateNodeBase implements INode {
    private _label: string = ''

    /** The display name of the node */
    name: string = ''
    
    /** The version number of the node implementation */
    version: number = 1.0
    
    /** The node type identifier */
    type: string = ''
    
    /** Icon path or identifier for UI representation */
    icon: string = ''
    
    /** Category the node belongs to for organizational purposes */
    category: string = ''
    
    /** Detailed description of the node's purpose and functionality */
    description: string = ''
    
    /** Base classes that this node extends or implements */
    baseClasses: string[] = []
    
    /** Optional credential configuration for authenticated operations */
    credential?: Record<string, any>
    
    /** Configuration inputs that this node accepts */
    inputs: INodeParams[] = []

    /**
     * Gets the node's label with proper private prefix
     * @returns The prefixed label string
     */
    get label(): string {
        return this._label
    }

    /**
     * Sets the node's label, ensuring it has the required 'private_' prefix
     * @param value - The label to set
     */
    set label(value: string) {
        this._label = value.startsWith('private_') ? value : `private_${value}`
    }
}
