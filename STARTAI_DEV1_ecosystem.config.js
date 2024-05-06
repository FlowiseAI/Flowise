module.exports = {
    apps: [
        {
            name: 'STARTAI_DEV1',
            script: './node_modules/pnpm/bin/pnpm.cjs',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_DEV1',
                PORT: 3034
            }
        }
    ]
}
