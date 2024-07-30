import { Assistant } from './Assistant'
import { ChatFlow } from './ChatFlow'
import { ChatMessage } from './ChatMessage'
import { ChatMessageFeedback } from './ChatMessageFeedback'
import { Credential } from './Credential'
import { DocumentStore } from './DocumentStore'
import { DocumentStoreFileChunk } from './DocumentStoreFileChunk'
import { Encryption } from './Encryption'
import { EncryptionCredential } from './EncryptionCredential'
import { Lead } from './Lead'
import { Tool } from './Tool'
import { UpsertHistory } from './UpsertHistory'
import { Variable } from './Variable'
import { ApiKey } from './ApiKey'

export const entities = {
    ChatFlow,
    ChatMessage,
    ChatMessageFeedback,
    Credential,
    Encryption,
    EncryptionCredential,
    Tool,
    Assistant,
    Variable,
    DocumentStore,
    DocumentStoreFileChunk,
    Lead,
    UpsertHistory,
    ApiKey
}
