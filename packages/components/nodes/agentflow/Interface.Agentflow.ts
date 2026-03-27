import { MessageContent } from '@langchain/core/messages'
import { IFileUpload } from '../../src/Interface'

export interface ILLMMessage {
    role: 'system' | 'assistant' | 'user' | 'tool' | 'developer'
    content: string
}

export interface IStructuredOutput {
    key: string
    type: 'string' | 'stringArray' | 'number' | 'boolean' | 'enum' | 'jsonArray'
    enumValues?: string
    description?: string
    jsonSchema?: string
}

export interface IFlowState {
    key: string
    value: string
}

// ─── Image & artifact interfaces ─────────────────────────────────────────────

/** Tracks which content-array indices map back to stored files. */
export interface IImageFileRef {
    index: number
    fileName: string
    mime: string
}

/** An artifact produced by a model (image, file, etc.). */
export interface IArtifact {
    type: string
    data: string
}

/** A file annotation from container file citations. */
export interface IFileAnnotation {
    filePath: string
    fileName: string
}

/** Result of saving an image to storage. */
export interface ISavedImageResult {
    filePath: string
    fileName: string
    totalSize: number
}

/** Info about a saved inline image (for replacing base64 in content). */
export interface ISavedInlineImage {
    filePath: string
    fileName: string
    mimeType: string
}

// ─── Response metadata interfaces (LLM provider outputs) ─────────────────────

/** OpenAI image generation output item. */
export interface IImageGenerationOutput {
    type: 'image_generation_call'
    id?: string
    result: string
    output_format?: string
}

/** Gemini inline data item (image generation). */
export interface IGeminiInlineData {
    type: 'gemini_inline_data'
    data: string
    mimeType: string
}

/** OpenAI container file citation annotation. */
export interface IContainerFileCitation {
    type: 'container_file_citation'
    container_id: string
    file_id: string
    filename: string
}

/** A single content item within a response metadata output. */
export interface IResponseOutputContent {
    annotations?: IContainerFileCitation[]
}

/** A single output item from response metadata. */
export interface IResponseMetadataOutput {
    type: string
    content?: IResponseOutputContent[]
    result?: string
    id?: string
    output_format?: string
}

/** Top-level response metadata shape from LLM providers. */
export interface IResponseMetadata {
    output?: IResponseMetadataOutput[]
    inlineData?: IGeminiInlineData[]
}

// ─── Message interfaces ──────────────────────────────────────────────────────

/** Stored-file content item within a message content array. */
export interface IStoredFileContent {
    type: 'stored-file'
    name: string
    mime: string
    path?: string
}

/**
 * Additional kwargs attached to messages in agentflow.
 * Extends LangChain's `Record<string, unknown>` with known keys.
 */
export interface IMessageAdditionalKwargs {
    artifacts?: IArtifact[]
    fileAnnotations?: IFileAnnotation[]
    usedTools?: unknown[]
    fileUploads?: string | IFileUpload[]
    _imageFileRefs?: IImageFileRef[]
    [key: string]: unknown
}

/**
 * Plain chat message as used in agentflow utils.
 * Compatible with LangChain's `MessageFieldWithRole` (which is `{role, content, name?} & Record<string, unknown>`).
 * The index signature ensures assignability to `BaseMessageLike`.
 */
export interface IChatMessage {
    role: string
    content: MessageContent
    additional_kwargs?: IMessageAdditionalKwargs
    _isTemporaryImageMessage?: boolean
    [key: string]: unknown
}

/** Image artifact extracted from an assistant message. */
export interface IImageArtifact {
    name: string
    mime: string
}

/** Content item in a multimodal message (superset of stored-file and image_url). */
export interface IMultimodalContentItem {
    type: string
    name?: string
    mime?: string
    data?: string
    image_url?: { url: string; detail?: string }
    [key: string]: unknown
}
