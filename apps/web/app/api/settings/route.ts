import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { prisma } from '@db/client'
import { respond401 } from '@utils/auth/respond401'
import { AppSettings } from 'types'

export async function POST(req: Request) {
    try {
        const session = await getCachedSession(req)
        if (!session?.user?.email) return respond401()

        const newSettings = await req.json()
        const { user } = session

        // Update user's app settings
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                appSettings: newSettings as object
            }
        })

        return NextResponse.json({
            success: true,
            appSettings: updatedUser.appSettings as AppSettings
        })
    } catch (error) {
        console.error('Failed to update settings:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const session = await getCachedSession(req)
        if (!session?.user?.email) return respond401()

        const { user } = session

        // Get user with current organization
        const userData = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                currentOrganization: true
            }
        })

        if (!userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({
            userSettings: userData.appSettings as AppSettings,
            orgSettings: userData.currentOrganization?.appSettings as AppSettings
        })
    } catch (error) {
        console.error('Failed to get settings:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
