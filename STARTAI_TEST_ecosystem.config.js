module.exports = {
    apps: [
        {
            name: 'STARTAI_TEST',
            script: './node_modules/pnpm/bin/pnpm.cjs',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_TEST',
                PORT: 3026
            }
        }
    ]
}
