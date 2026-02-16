import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";

export default tseslint.config(
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },
  { ignores: ["**/dist/**", "**/coverage/**"] },
  pluginVue.configs["flat/essential"],
  ...tseslint.configs.recommended,
  // Manual Vue parser configuration required because @vue/eslint-config-typescript
  // doesn't support ESLint v10 yet. This configures the parser for .vue files
  // to use vue-eslint-parser with typescript-eslint as the script parser.
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
    },
  },
  skipFormatting,
  {
    rules: {
      "vue/multi-word-component-names": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
