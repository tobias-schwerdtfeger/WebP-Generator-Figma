module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@figma/figma-plugins/recommended",
    "plugin:react/recommended",
    "prettier",
  ],
  rules: {
    "react/react-in-jsx-scope": 0,
    "react/no-unknown-property": 0,
    "max-len": ["error", { code: 120 }],
    "@typescript-eslint/no-explicit-any": "off",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
