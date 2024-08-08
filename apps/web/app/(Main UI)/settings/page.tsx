import React from 'react'
import { redirect } from 'next/navigation'

const AppSettingPage = async ({ params }: any) => {
    return redirect('/settings/integrations')
}

export default AppSettingPage
