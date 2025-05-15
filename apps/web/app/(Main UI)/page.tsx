import { redirect } from 'next/navigation'
import React from 'react'

// import Homepage from '@ui/Homepage';

export const metadata = {
    title: 'Answer Agent',
    description: 'Welcome to Answer Agent, the last stop for all your questions.'
}

const HomepagePage = async () => {
    return redirect('/chat')
}

export default HomepagePage
