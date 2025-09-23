<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <pre class="code-block" v-html="html"></pre>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { monaco } from "../services/monaco";
import { useDemoDark } from "../composables/useDemoDark";

interface Props {
  code: string;
  language: "javascript" | "typescript";
}

const props = defineProps<Props>();
const html = ref("");
const isDark = useDemoDark();

async function colorize() {
  const theme = isDark.value ? "vs-dark" : "vs";
  monaco.editor.setTheme(theme);
  html.value = await monaco.editor.colorize(props.code, props.language, {
    tabSize: 2,
  });
}

onMounted(colorize);
watch(() => props.code, colorize);
watch(() => props.language, colorize);
watch(isDark, colorize);
</script>

<style scoped>
.code-block {
  margin: 0;
  padding: 12px;
  font-size: 13px;
  line-height: 1.4;
  overflow: auto;
  background: var(--surface);
  color: var(--text);
  font-family:
    "Fira Code", "Fira Mono", Menlo, Consolas, "Liberation Mono", monospace;
}
</style>
