module.exports = {
    apps: [
        {
            name: 'STARTAI_TEN',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_TEN',
                PORT: 3031
            }
        }
    ]
}
