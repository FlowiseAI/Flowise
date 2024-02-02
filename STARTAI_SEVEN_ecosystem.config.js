module.exports = {
    apps: [
        {
            name: 'STARTAI_SEVEN',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_SEVEN',
                PORT: 3028
            }
        }
    ]
}
