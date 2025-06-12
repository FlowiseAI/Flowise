const { PrismaPlugin } = require('experimental-prisma-webpack-plugin')

const webpack = require('webpack')
// const { withSentryConfig } = require('@sentry/nextjs');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true'
})

console.log('Auth0 configs', {
    AUTH0_BASE_URL: process.env.AUTH0_BASE_URL,
    AUTH0_ORGANIZATION_ID: process.env.AUTH0_ORGANIZATION_ID,
    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
    AUTH0_SECRET: process.env.AUTH0_SECRET
})
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
        AUTH0_BASE_URL: process.env.AUTH0_BASE_URL ?? `https://${process.env.VERCEL_BRANCH_URL}`,
        REACT_APP_AUTH0_ORGANIZATION_ID: process.env.AUTH0_ORGANIZATION_ID,
        REACT_APP_AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
        REACT_APP_AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
        REACT_APP_AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
        FLAGSMITH_ENVIRONMENT_ID: process.env.FLAGSMITH_ENVIRONMENT_ID,
        AUTH0_SECRET: process.env.AUTH0_SECRET ?? process.env.WEB_AUTH0_SECRET,
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

const disableSentry = process.env.DISABLE_SENTRY
if (!disableSentry) {
    // nextConfig = withSentryConfig(nextConfig);
    console.warn('Sentry is NOT enabled.')
} else {
    console.warn('Sentry is disabled.  Please check your environment variables.')
}

module.exports = nextConfig
