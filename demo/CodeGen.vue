<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { useLocalStorage, useTimeoutFn } from "@vueuse/core";
import { track } from "@vercel/analytics";

import {
  getImportsFromOption,
  type Quote,
  type PublicCodegenOptions,
} from "./utils/codegen";
import {
  createOptionEditor,
  createCodeViewer,
  type OptionEditor,
  type CodeViewer,
} from "./services/monaco";
import {
  useOptionAnalysis,
  type AnalyzerIssue,
} from "./composables/useOptionAnalysis";
import { useDemoDark } from "./composables/useDemoDark";

const DEFAULT_OPTION = `{
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

interface CodegenPreferences {
  indent: string;
  quote: Quote;
  multiline: boolean;
  maxLen: number;
  semi: boolean;
  includeType: boolean;
  renderer: Renderer;
}

const codegenOptions = useLocalStorage<CodegenPreferences>(
  "ve.codegenOptions",
  {
    indent: "  ",
    quote: "'",
    multiline: false,
    maxLen: 80,
    semi: false,
    includeType: false,
    renderer: "canvas",
  } satisfies CodegenPreferences,
);

const props = defineProps<{ open: boolean; renderer: string }>();
const emit = defineEmits<{ "update:open": [boolean] }>();

const {
  code: sourceCode,
  state: analysisState,
  updateSource,
  dispose: disposeAnalysis,
} = useOptionAnalysis(DEFAULT_OPTION);

const dialog = ref<HTMLElement | null>(null);
let clickFrom: Node | null = null;

const editorEl = ref<HTMLElement | null>(null);
const outputEl = ref<HTMLElement | null>(null);
let optionEditor: OptionEditor | null = null;
let importViewer: CodeViewer | null = null;
let suppressNextEditorEvent = false;
const initializing = ref<boolean>(true);
const showAnalyzingOverlay = ref(false);
const { start: scheduleAnalyzingOverlay, stop: cancelAnalyzingOverlay } =
  useTimeoutFn(() => {
    showAnalyzingOverlay.value = true;
  }, 180);

type Renderer = "canvas" | "svg";

const renderer = ref<Renderer>(props.renderer === "svg" ? "svg" : "canvas");
codegenOptions.value.renderer = renderer.value;

const isDark = useDemoDark();
const monacoTheme = computed(() => (isDark.value ? "vs-dark" : "vs"));

watch(
  () => props.renderer,
  (value) => {
    if (props.open) {
      renderer.value = value === "svg" ? "svg" : "canvas";
    }
  },
);

watch(renderer, (value) => {
  codegenOptions.value.renderer = value;
});

function onMousedown(event: MouseEvent) {
  clickFrom = event.target instanceof Node ? event.target : null;
}

function closeFromOutside() {
  const target = clickFrom;
  if (target && dialog.value?.contains(target)) {
    return;
  }
  close();
}

function close() {
  emit("update:open", false);
}

const copied = ref(false);
const messageOpen = ref(false);
const { start: scheduleMessageClose, stop: cancelMessageClose } = useTimeoutFn(
  () => {
    messageOpen.value = false;
  },
  2018,
);

function trackCopy(from: "button" | "system") {
  if (copied.value) {
    return;
  }
  copied.value = true;
  track("copy-code", { from });
}

function formatIssues(issues: readonly AnalyzerIssue[]) {
  if (!issues.length) {
    return "";
  }
  return issues
    .map((issue) => {
      const lines = [`/* ${issue.message} */`];
      if (issue.hint) {
        lines.push(`// Hint: ${issue.hint}`);
      }
      if (issue.range) {
        const pointer = `${issue.range.startLineNumber}:${issue.range.startColumn}`;
        lines.push(`// ${pointer}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

const hasErrors = computed<boolean>(() => analysisState.hasBlockingIssue);

const isBusy = computed<boolean>(
  () => initializing.value || showAnalyzingOverlay.value,
);

const importCode = computed(() => {
  const raw = sourceCode.value.trim();
  if (!raw) {
    return "// Paste your option code first";
  }

  if (hasErrors.value) {
    const blockingIssues = analysisState.issues.filter(
      (issue) => issue.severity === "error",
    );
    return formatIssues(blockingIssues);
  }

  if (!analysisState.option) {
    return "// Option analysis did not produce a result";
  }

  try {
    const preferences = codegenOptions.value;
    const config: PublicCodegenOptions = {
      indent: preferences.indent,
      quote: preferences.quote,
      multiline: preferences.multiline,
      maxLen: preferences.maxLen,
      semi: preferences.semi,
      includeType: preferences.includeType,
      renderer: renderer.value,
    };
    return getImportsFromOption(analysisState.option, config);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return `/* Invalid ECharts option */\n\n// ${message}`;
  }
});

watch(importCode, (value) => {
  importViewer?.setValue(value);
  copied.value = false;
});

function copy() {
  if (!navigator.clipboard) {
    return;
  }
  trackCopy("button");
  navigator.clipboard.writeText(importCode.value);
  messageOpen.value = true;
  cancelMessageClose();
  scheduleMessageClose();
}

onMounted(async () => {
  await nextTick();
  if (editorEl.value) {
    optionEditor = createOptionEditor(editorEl.value, {
      initialCode: sourceCode.value,
      theme: monacoTheme.value,
      onChange(value) {
        if (suppressNextEditorEvent) {
          return;
        }
        updateSource(value);
      },
    });
    optionEditor.setMarkers(analysisState.diagnostics);
  }
  if (outputEl.value) {
    importViewer = createCodeViewer(outputEl.value, {
      initialCode: importCode.value,
      language: codegenOptions.value.includeType ? "typescript" : "javascript",
      theme: monacoTheme.value,
    });
  }
  initializing.value = false;
});

watch(monacoTheme, (theme) => {
  optionEditor?.setTheme(theme);
  importViewer?.setTheme(theme);
});

watch(
  () => codegenOptions.value.includeType,
  (includeType) => {
    importViewer?.setLanguage(includeType ? "typescript" : "javascript");
    importViewer?.setValue(importCode.value);
  },
);

watch(
  () => analysisState.status,
  (status) => {
    if (status === "analyzing" && !initializing.value) {
      scheduleAnalyzingOverlay();
      return;
    }
    cancelAnalyzingOverlay();
    showAnalyzingOverlay.value = false;
  },
  { immediate: true },
);

watch(
  () => props.open,
  async (value) => {
    if (value) {
      renderer.value = props.renderer === "svg" ? "svg" : "canvas";
      await nextTick();
      optionEditor?.editor.focus();
      optionEditor?.editor.layout();
      importViewer?.editor.layout();
    }
  },
);

watch(
  () => analysisState.diagnostics,
  (diagnostics) => {
    optionEditor?.setMarkers(diagnostics);
  },
  { deep: true },
);

watch(sourceCode, (value) => {
  if (!optionEditor) {
    return;
  }
  const current = optionEditor.getValue();
  if (current === value) {
    return;
  }
  try {
    suppressNextEditorEvent = true;
    optionEditor.setValue(value);
  } finally {
    suppressNextEditorEvent = false;
  }
});

onBeforeUnmount(() => {
  cancelMessageClose();
  cancelAnalyzingOverlay();
  optionEditor?.dispose();
  optionEditor = null;
  importViewer?.dispose();
  importViewer = null;
  disposeAnalysis();
});
</script>

<template>
  <aside
    class="modal"
    :class="{ open: props.open }"
    @mousedown="onMousedown"
    @click="closeFromOutside"
    @keydown.esc="close"
  >
    <section
      ref="dialog"
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="codegen-title"
    >
      <h2 id="codegen-title">Generate import code</h2>
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
          <input v-model="codegenOptions.includeType" type="checkbox" />
        </label>
        <label>
          Multiline
          <input v-model="codegenOptions.multiline" type="checkbox" />
        </label>
        <label>
          Semi
          <input v-model="codegenOptions.semi" type="checkbox" />
        </label>
        <label>
          Quote
          <select v-model="codegenOptions.quote">
            <option value="'">Single</option>
            <option value='"'>Double</option>
          </select>
        </label>
        <label>
          Indent
          <select v-model="codegenOptions.indent">
            <option value="  ">2 spaces</option>
            <option value="    ">4 spaces</option>
            <option value="	">Tab</option>
          </select>
        </label>
        <label>
          Max length
          <input
            v-model.number="codegenOptions.maxLen"
            type="number"
            step="10"
          />
        </label>
      </section>
      <section class="code">
        <div
          ref="editorEl"
          class="option-code"
          aria-label="ECharts option (TS/JS literal)"
          :aria-busy="isBusy"
        ></div>
        <div
          ref="outputEl"
          class="import-code"
          role="textbox"
          aria-label="Generated import code"
          aria-readonly="true"
          @copy="trackCopy('system')"
        ></div>
        <button
          class="copy"
          :disabled="analysisState.hasBlockingIssue"
          @click="copy"
        >
          Copy
        </button>
      </section>
    </section>
  </aside>

  <aside
    class="message"
    :class="{ open: messageOpen }"
    role="status"
    aria-live="polite"
  >
    Copied to clipboard
  </aside>
</template>

<style>
.dialog {
  display: flex;
  flex-direction: column;
  width: 80vw;
  height: 90vh;
  border-radius: var(--r-l);
  overflow: hidden;
  background-color: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.dialog h2 {
  margin-top: 2rem;
}

.options {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--border);

  label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
  }

  input[type="number"] {
    width: 54px;
  }

  input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    accent-color: var(--accent);
  }
}

.code {
  position: relative;
  display: flex;
  justify-content: center;
  text-align: left;
  align-items: stretch;
  flex-grow: 1;
  min-height: 0;
  tab-size: 4;

  .option-code,
  .import-code {
    flex: 0 0 50%;
    margin: 0;
    border: none;
  }

  .option-code[aria-busy="true"]::after {
    content: "Analyzing...";
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: var(--surface);
    color: var(--muted);
    font-size: 0.85rem;
    pointer-events: none;
    z-index: 1;
  }
}

.copy {
  position: absolute;
  right: 10px;
  top: 10px;
  border-radius: var(--r-m);
  border: 1px solid var(--border);
}

.message {
  position: fixed;
  z-index: 2147483647;
  bottom: 2rem;
  left: 50%;
  padding: 0.5rem 0.75rem;
  background-color: var(--text);
  box-shadow: var(--shadow);
  color: var(--surface);
  font-size: 0.875rem;
  transform: translate(-50%, 200%);
  border-radius: var(--r-s);
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
