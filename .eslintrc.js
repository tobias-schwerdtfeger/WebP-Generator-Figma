module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
        'plugin:react/recommended',
    ],
    rules: {
        'react/react-in-jsx-scope': 0,
        'react/no-unknown-property': 0,
        'max-len': ["error", { "code": 120 }]
    }
};
