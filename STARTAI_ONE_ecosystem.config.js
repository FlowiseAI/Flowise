module.exports = {
    apps: [
        {
            name: 'STARTAI_ONE',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_ONE',
                PORT: 3021
            }
        }
    ]
}
