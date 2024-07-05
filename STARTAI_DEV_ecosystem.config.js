module.exports = {
    apps: [
        {
            name: 'STARTAI_DEV',
            script: './node_modules/pnpm/bin/pnpm.cjs',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_DEV',
                PORT: 10004
            }
        }
    ]
}
