<script setup>
import {
  ref,
  computed,
  watch,
  onBeforeUnmount,
  onMounted,
  nextTick
} from "vue";
import { useLocalStorage } from "@vueuse/core";
import "highlight.js/styles/github.css";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import hljsVuePlugin from "@highlightjs/vue-plugin";
import { initialize, transform } from "esbuild-wasm";
import wasmURL from "esbuild-wasm/esbuild.wasm?url";
import { track } from "@vercel/analytics";

import { getImportsFromOption } from "./utils/codegen";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
const CodeHighlight = hljsVuePlugin.component;

const codegenOptions = useLocalStorage("ve.codegenOptions", {
  indent: "  ",
  quote: "'",
  multiline: false,
  maxLen: 80,
  semi: false,
  includeType: false
});

const props = defineProps({ open: Boolean, renderer: String });
const emit = defineEmits(["update:open"]);

const dialog = ref(null);
let clickFrom = null;

function closeFromOutside() {
  if (dialog.value?.contains(clickFrom)) {
    return;
  }
  close();
}

function close() {
  emit("update:open", false);
}

const renderer = ref(props.renderer);
const source = ref(null);
watch(
  () => props.open,
  async val => {
    if (val) {
      renderer.value = props.renderer;
    }

    await nextTick();

    if (initializing.value) {
      return;
    }
    source.value?.focus();
  }
);

const copied = ref(false);
const initializing = ref(true);
const optionCode = ref("");
const transformedCode = ref("");
const transformErrors = ref([]);

onMounted(async () => {
  await initialize({ wasmURL });

  initializing.value = false;

  optionCode.value = `{
  title: {
    text: 'Referer of a Website',
    subtext: 'Fake Data',
    left: 'center'
  },
  tooltip: {
    trigger: 'item'
  },
  legend: {
    orient: 'vertical',
    left: 'left'
  },
  series: [
    {
      name: 'Access From',
      type: 'pie',
      radius: '50%',
      data: [
        { value: 1048, name: 'Search Engine' },
        { value: 735, name: 'Direct' },
        { value: 580, name: 'Email' },
        { value: 484, name: 'Union Ads' },
        { value: 300, name: 'Video Ads' }
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
}`;

  await nextTick();

  source.value?.focus();
});

watch(optionCode, async val => {
  try {
    transformedCode.value = await transform(`(${val})`, { loader: "ts" });
    transformErrors.value = [];
  } catch (e) {
    transformErrors.value = e.errors;
  }
});

function formatError(errors) {
  return errors
    .map(({ text, location: { lineText, line, column, length } }) => {
      const digit = Math.ceil(Math.log10(line)) || 1;
      lineText = line === 1 ? lineText.slice(1) : lineText;
      lineText =
        line === optionCode.value.split("\n").length
          ? lineText.slice(0, -1)
          : lineText;
      column = line === 1 ? column - 1 : column;

      return `/* ${text} */

// ${line} | ${lineText}
// ${" ".repeat(digit)} | ${" ".repeat(column)}${"~".repeat(length)}
`;
    })
    .join("\n\n");
}

const importCode = computed(() => {
  if (optionCode.value.trim() === "") {
    return "// Paste your option code first";
  }

  if (transformErrors.value.length) {
    return formatError(transformErrors.value);
  }

  try {
    return getImportsFromOption(eval(transformedCode.value.code), {
      renderer: renderer.value,
      ...codegenOptions.value
    });
  } catch (e) {
    return `/* Invalid ECharts option */

// ${e.message}
`;
  }
});

watch(importCode, () => {
  copied.value = false;
});

// copy message
const messageOpen = ref(false);
let messageTimer;

function trackCopy(from) {
  if (copied.value) {
    // only track copy after modifications
    return;
  }

  copied.value = true;
  track("copy-code", { from });
}

function copy() {
  trackCopy("button");
  clearTimeout(messageTimer);

  navigator.clipboard.writeText(importCode.value);
  messageOpen.value = true;

  messageTimer = setTimeout(() => {
    messageOpen.value = false;
  }, 2018);
}

onBeforeUnmount(() => {
  clearTimeout(messageTimer);
});
</script>

<template>
  <aside
    class="modal"
    :class="{ open: props.open }"
    @mousedown="clickFrom = $event.target"
    @click="closeFromOutside"
    @keydown.esc="close"
  >
    <section class="dialog" ref="dialog">
      <h2>✨ <code>import</code> code generator</h2>
      <section class="options">
        <label>
          Renderer
          <select v-model="renderer">
            <option value="canvas">Canvas</option>
            <option value="svg">SVG</option>
          </select>
        </label>
        <label>
          TypeScript
          <input type="checkbox" v-model="codegenOptions.includeType" />
        </label>
        <label>
          Multiline
          <input type="checkbox" v-model="codegenOptions.multiline" />
        </label>
        <label>
          Semi
          <input type="checkbox" v-model="codegenOptions.semi" />
        </label>
        <label>
          Quote
          <select v-model="codegenOptions.quote">
            <option value="'">single</option>
            <option value='"'>double</option>
          </select>
        </label>
        <label>
          Indent
          <select v-model="codegenOptions.indent">
            <option value="  ">2</option>
            <option value="    ">4</option>
            <option value="	">Tab</option>
          </select>
        </label>
        <label>
          Max length
          <input
            type="number"
            step="10"
            v-model.number="codegenOptions.maxLen"
          />
        </label>
      </section>
      <section class="code">
        <textarea
          ref="source"
          class="option-code"
          v-model="optionCode"
          :placeholder="
            initializing
              ? 'Initializing...'
              : 'Paste your option code (TS/JS literal) here...'
          "
          :disabled="initializing"
          autofocus
          spellcheck="false"
        ></textarea>
        <div class="import-code" @copy="trackCopy('system')">
          <code-highlight
            :language="codegenOptions.includeType ? 'typescript' : 'javascript'"
            :code="importCode"
          />
        </div>
        <button
          class="copy"
          @click="copy"
          :disabled="importCode.startsWith('/*') || importCode.startsWith('//')"
        >
          Copy
        </button>
      </section>
    </section>
  </aside>

  <aside class="message" :class="{ open: messageOpen }">
    Copied to clipboard
  </aside>
</template>

<style>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Works for Firefox */
input[type="number"] {
  appearance: textfield;
}

input[type="text"],
input[type="number"] {
  cursor: text;
}

.dialog {
  display: flex;
  flex-direction: column;
  width: 80vw;
  height: 90vh;
  border-radius: 6px;
  overflow: hidden;
  background-color: #fff;
  box-shadow: 0 0 45px rgba(0, 0, 0, 0.2);
}

.options {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);

  label {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  input,
  button,
  select {
    height: 2.4em;
  }

  input[type="number"] {
    width: 60px;
  }
}

.code {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-grow: 1;
  min-height: 0;
  tab-size: 4;

  .option-code,
  .import-code {
    flex: 0 0 50%;
    margin: 0;
    border: none;
    line-height: 1.2;
    font-size: 13px;
    overflow: auto;
  }

  .import-code {
    border-left: 1px solid rgba(0, 0, 0, 0.1);

    pre {
      display: block;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #fff;
      box-shadow: none;
    }

    code {
      height: 100%;
    }
  }

  .option-code {
    padding: 1em;
    outline: none;
    resize: none;
  }
}

.copy {
  position: absolute;
  right: 10px;
  top: 10px;
}

.message {
  position: fixed;
  z-index: 2147483647;
  bottom: 2rem;
  left: 50%;
  padding: 0.5rem 0.75rem;
  background-color: rgba(45, 52, 64, 0.98);
  box-shadow: 0 4px 16px rgba(45, 52, 64, 0.6);
  color: #fff;
  font-size: 0.875rem;
  transform: translate(-50%, 200%);
  border-radius: 4px;
  opacity: 0;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.message.open {
  transform: translate(-50%, 0);
  opacity: 1;
}
</style>
