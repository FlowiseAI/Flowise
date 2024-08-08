import { redirect } from 'next/navigation'
import React from 'react'

// import Homepage from '@ui/Homepage';

export const metadata = {
    title: 'Answers AI',
    description: 'Welcome to Answers AI, the last stop for all your questions.'
}

const HomepagePage = async () => {
    return redirect('/chat')
}

export default HomepagePage
