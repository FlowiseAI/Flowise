const { PrismaPlugin } = require('experimental-prisma-webpack-plugin')

const webpack = require('webpack')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true'
})
// SECURITY: Parse DATABASE_SECRET at runtime if available (fallback mechanism)
// This ensures DATABASE_URL is available even if shell environment inheritance fails
if (process.env.DATABASE_SECRET && !process.env.DATABASE_URL) {
    try {
        const { engine, host, port, dbname, username, password } = JSON.parse(process.env.DATABASE_SECRET)
        process.env.DATABASE_HOST = host
        process.env.DATABASE_PORT = port
        process.env.DATABASE_NAME = dbname
        process.env.DATABASE_USER = username
        process.env.DATABASE_PASSWORD = password
        process.env.DATABASE_TYPE = engine

        // Construct DATABASE_URL for Prisma
        process.env.DATABASE_URL = `postgresql://${username}:${password}@${host}:${port}/${dbname}?schema=web&connection_limit=1`

        if (process.env.NODE_ENV !== 'production') {
            console.log('DATABASE_URL parsed from DATABASE_SECRET in next.config.js')
        }
    } catch (error) {
        console.error('Failed to parse DATABASE_SECRET in next.config.js:', error.message)
    }
}
/**
 * @type {import('next').NextConfig}
 */
let nextConfig = withBundleAnalyzer({
    // Enable standalone output for Docker deployments
    ...(!process.env.VERCEL
        ? {
              output: 'standalone'
          }
        : {}),
    experimental: {
        turbo: {
            resolveAlias: {
                '@db/*': '../../packages-answers/db/src/*',
                '@utils/*': '../../packages-answers/utils/src/*',
                '@ui/*': '../../packages-answers/ui/src/*',
                '@types/*': '../../packages-answers/types/src/*',
                '@tsconfig/*': '../../packages-answers/tsconfig/src/*',
                '@/views/*': '../../packages/ui/src/views/*',
                '@/utils/*': '../../packages/ui/src/utils/*',
                '@/assets/*': '../../packages/ui/src/assets/*',
                '@/hooks/*': '../../packages/ui/src/hooks/*',
                '@/menu-items/*': '../../packages/ui/src/menu-items/*',
                '@/store/*': '../../packages/ui/src/store/*',
                '@/themes/*': '../../packages/ui/src/themes/*',
                '@/themes': '../../packages/ui/src/themes/index',
                '@/assets/images/*': '../../packages/ui/src/assets/images/*'
            }
        },
        serverComponentsExternalPackages: ['canvas', '@aws-sdk/client-s3', '@aws-sdk/signature-v4-crt', '@aws-sdk/s3-request-presigner']
    },
    typescript: {
        ignoreBuildErrors: true
    },

    reactStrictMode: true,
    transpilePackages: ['ui', 'db', 'utils'],
    // modularizeImports: {
    //     '@mui/material': {
    //         transform: '@mui/material/{{member}}'
    //     },
    //     '@mui/icons-material': {
    //         transform: '@mui/icons-material/{{member}}'
    //     }
    // },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'replicate.delivery',
                port: '',
                pathname: '/**'
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '4000',
                pathname: '/**'
            }
        ]
    },
    env: {
        // Use explicit AUTH0_BASE_URL from environment, fallback to VERCEL_BRANCH_URL if on Vercel
        AUTH0_BASE_URL:
            process.env.AUTH0_BASE_URL ?? (process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined),
        FLAGSMITH_ENVIRONMENT_ID: process.env.FLAGSMITH_ENVIRONMENT_ID,
        AUTH0_SECRET: process.env.AUTH0_SECRET,
        CHATFLOW_DOMAIN_OVERRIDE: process.env.CHATFLOW_DOMAIN_OVERRIDE
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

        config.module.rules.push({
            test: /\.svg$/,
            use: [
                {
                    loader: '@svgr/webpack',
                    options: {
                        svgo: false
                    }
                },
                {
                    loader: 'url-loader',
                    options: {
                        limit: 8192, // 8kb
                        name: '[name].[hash:8].[ext]',
                        outputPath: 'static/images/',
                        publicPath: '/_next/static/images/'
                    }
                }
            ]
        })
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

// Sentry removed completely

module.exports = nextConfig
