import { slugify } from './slugify'
import { v4 as uuidV4 } from 'uuid'

export const getUniqueDocumentPath = ({ organizationId, title }: { organizationId: string; title: string }) =>
    `${organizationId}/${slugify(title)}-${uuidV4()}`
