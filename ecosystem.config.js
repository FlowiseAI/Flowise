module.exports = {
    apps: [
        {
            name: 'flowise',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'development',
                PORT: process.env.PORT || 3023
            }
        }
    ]
}
