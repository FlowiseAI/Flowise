module.exports = {
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: process.env.CORS_ORIGINS || 'https://flowise-ui-liart.vercel.app,http://localhost:3000' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
                    { key: 'Access-Control-Allow-Credentials', value: 'true' }
                ]
            }
        ]
    },
    async rewrites() {
        return [
            {
                source: '/api/proxy/:path*',
                destination: 'https://flowise-ai-cqlx.onrender.com/api/v1/:path*'
            }
        ]
    },
    experimental: {
        runtime: 'edge'
    },
    api: {
        externalResolver: true,
        responseLimit: false,
        bodyParser: false,
        timeout: 10
    }
}
