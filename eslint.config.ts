import {
  defineConfigWithVueTs,
  vueTsConfigs
} from "@vue/eslint-config-typescript";
import pluginVue from "eslint-plugin-vue";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";
// The inferred type of 'default' cannot be named without a reference to "@typescript-eslint/utils"
import type {} from "@typescript-eslint/utils";

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"]
  },
  { ignores: ["**/dist/**"] },
  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  skipFormatting,
  {
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/block-lang": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
);
