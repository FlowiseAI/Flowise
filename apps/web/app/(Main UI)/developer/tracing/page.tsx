import React from 'react'

export const metadata = {
    title: 'Tracing | Answer Agent'
}

const StoreTracingPage = () => {
    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <iframe
                    src={process.env.DB_STUDIO_SERVER_URL || 'http://localhost:4173'}
                    width='100%'
                    height='100%'
                    style={{ border: 'none' }}
                />
            </div>
        </>
    )
}
export default StoreTracingPage
