module.exports = {
    root: true,
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
    plugins: ['@typescript-eslint'],
    parser: '@typescript-eslint/parser',
    ignorePatterns: ['**/*.json', '**/*.md', 'dist'],
    rules: {
        '@next/next/no-img-element': 'off',
        '@next/next/no-html-link-for-pages': 'off',
        '@typescript-eslint/no-namespace': 'off'
    }
}
