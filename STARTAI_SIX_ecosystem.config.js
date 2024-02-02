module.exports = {
    apps: [
        {
            name: 'STARTAI_SIX',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_SIX',
                PORT: 3027
            }
        }
    ]
}
