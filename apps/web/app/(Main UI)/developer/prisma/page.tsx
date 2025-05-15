import React from 'react'

export const metadata = {
    title: 'DB | Answer Agent'
}

const DB_STUDIO_SERVER_URL = process.env.DB_STUDIO_SERVER_URL || 'http://localhost:5555/'

const DB_STUDIO = () => {
    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <iframe src={DB_STUDIO_SERVER_URL} width='100%' height='100%' style={{ border: 'none' }} />
            </div>
        </>
    )
}

export default DB_STUDIO
