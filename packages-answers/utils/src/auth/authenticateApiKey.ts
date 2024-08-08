import { prisma } from '@db/client'
import { ApiKeyType, Organization, User } from 'db/generated/prisma-client'

export type AuthenticateApiKeyResult =
    | {
          type: 'user'
          user: User
      }
    | {
          type: 'organization'
          organization: Organization
      }

export const authenticateApiKey = async (req: Request): Promise<AuthenticateApiKeyResult | null> => {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null

    const apiKey = await prisma.apiKey.findUnique({
        where: {
            key: token
        },
        include: {
            user: true,
            organization: true
        }
    })

    return apiKey?.type === ApiKeyType.USER && apiKey?.user
        ? {
              type: 'user',
              user: apiKey?.user
          }
        : apiKey?.type === ApiKeyType.ORGANIZATION && apiKey?.organization
        ? {
              type: 'organization',
              organization: apiKey.organization
          }
        : null
}
