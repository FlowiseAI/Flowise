// import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { prisma } from '@db/client'
import { respond401 } from '@utils/auth/respond401'
import { NextApiRequest } from 'next'

export async function POST(req: Request, res: any) {
    try {
        const session = await getCachedSession(req)
        if (!session?.user?.email) return respond401()
        const { appId, appType, config } = await req.json()
        const { user } = session

        const newAppConfig = await prisma.appConfig.create({
            data: {
                userId: user.id,
                appId: appId,
                appType: appType,
                config: config
            }
        })

        return NextResponse.json({
            appConfig: newAppConfig
        })
    } catch (error) {
        console.error('Failed to create AppConfig:', error)
        return res.status(500).json({ error: 'Internal Server Error' })
    }
}

export async function GET(req: NextRequest, res: any) {
    try {
        const session = await getCachedSession(req)
        if (!session?.user?.email) return respond401()
        const appConfigId = req.nextUrl.searchParams.get('app_config_id')
        const { user } = session

        if (!appConfigId) {
            return NextResponse.json(
                {
                    error: 'No app config id provided'
                },
                { status: 400 }
            )
        }

        const appConfig = await prisma.appConfig.findUnique({
            where: {
                id: appConfigId
            }
        })

        return NextResponse.json({
            appConfig
        })
    } catch (error) {
        console.error('Failed to get AppConfig:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest, res: any) {
    try {
        const session = await getCachedSession(req)
        if (!session?.user?.email) return respond401()
        const { config } = await req.json()
        const appConfigId = req.nextUrl.searchParams.get('app_config_id')

        if (!appConfigId) {
            return NextResponse.json(
                {
                    error: 'No app config id provided'
                },
                { status: 400 }
            )
        }

        const updatedAppConfig = await prisma.appConfig.update({
            where: {
                id: appConfigId
            },
            data: {
                config: config
            }
        })

        return NextResponse.json({
            appConfig: updatedAppConfig
        })
    } catch (error) {
        console.error('Failed to update AppConfig:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
