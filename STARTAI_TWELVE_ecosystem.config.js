module.exports = {
    apps: [
        {
            name: 'STARTAI_TWELVE',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_TWELVE',
                PORT: 3033
            }
        }
    ]
}
