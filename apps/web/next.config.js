const { PrismaPlugin } = require('experimental-prisma-webpack-plugin')

const webpack = require('webpack')
// const { withSentryConfig } = require('@sentry/nextjs');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true'
})
/**
 * @type {import('next').NextConfig}
 */
let nextConfig = withBundleAnalyzer({
    experimental: {
        serverComponentsExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/signature-v4-crt', '@aws-sdk/s3-request-presigner']
    },

    typescript: {
        ignoreBuildErrors: true
    },

    reactStrictMode: true,
    transpilePackages: ['ui', 'db', 'utils'],
    modularizeImports: {
        // '@mui/material/?(((\\w*)?/?)*)': {
        //   transform: '@mui/material/{{ matches.[1] }}/{{member}}'
        // },
        '@mui/icons-material/?(((\\w*)?/?)*)': {
            transform: '@mui/icons-material/{{ matches.[1] }}/{{member}}'
        }
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'replicate.delivery',
                port: '',
                pathname: '/**'
            }
        ]
    },
    env: {
        AUTH0_BASE_URL: process.env.AUTH0_BASE_URL ?? `https://${process.env.VERCEL_BRANCH_URL}`,
        VITE_AUTH_ORGANIZATION_ID: process.env.AUTH0_ORGANIZATION_ID,
        VITE_AUTH_AUDIENCE: process.env.AUTH0_AUDIENCE,
        VITE_AUTH_DOMAIN: process.env.AUTH0_DOMAIN,
        VITE_AUTH_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
        FLAGSMITH_ENVIRONMENT_ID: process.env.FLAGSMITH_ENVIRONMENT_ID
    },
    webpack: (config, { isServer }) => {
        config.externals = [...config.externals, 'db', 'puppeteer', 'handlebars']
        config.plugins = [
            ...config.plugins,
            // new PrismaPlugin(),
            new webpack.IgnorePlugin({
                resourceRegExp: /canvas/,
                contextRegExp: /jsdom$/
            })
        ]

        if (isServer) {
            config.plugins = [...config.plugins, new PrismaPlugin()]
            // Avoid AWS SDK Node.js require issue
            // if (nextRuntime === 'nodejs') {
            //   config.plugins = [
            //     ...config.plugins,
            //     new webpack.IgnorePlugin({ resourceRegExp: /^aws-crt$/ })
            //   ];
            // }
        }

        return config
    }
})

const disableSentry = process.env.DISABLE_SENTRY
if (!disableSentry) {
    // nextConfig = withSentryConfig(nextConfig);
    console.warn('Sentry is NOT enabled.')
} else {
    console.warn('Sentry is disabled.  Please check your environment variables.')
}

module.exports = nextConfig
