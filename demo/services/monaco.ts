import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";

const globalWithMonaco = globalThis as typeof globalThis & {
  MonacoEnvironment?: {
    getWorker: (moduleId: string, label: string) => Worker;
  };
};

if (!globalWithMonaco.MonacoEnvironment) {
  globalWithMonaco.MonacoEnvironment = {
    getWorker(_: string, label: string) {
      if (label === "json") {
        return new jsonWorker();
      }
      if (label === "typescript" || label === "javascript") {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };
}

const diagnosticsOptions: monaco.languages.typescript.DiagnosticsOptions = {
  noSemanticValidation: true,
  noSyntaxValidation: true,
  noSuggestionDiagnostics: true,
};

monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(diagnosticsOptions);
monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(diagnosticsOptions);
monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

export type MonacoSeverity = "error" | "warning" | "info" | "hint";

export interface MonacoMarkerLike {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  code?: string;
  source?: string;
  severity?: MonacoSeverity;
}

const SEVERITY_MAP: Record<MonacoSeverity, monaco.MarkerSeverity> = {
  error: monaco.MarkerSeverity.Error,
  warning: monaco.MarkerSeverity.Warning,
  info: monaco.MarkerSeverity.Info,
  hint: monaco.MarkerSeverity.Hint,
};

export interface OptionEditor {
  editor: monaco.editor.IStandaloneCodeEditor;
  getValue(): string;
  setValue(value: string): void;
  setMarkers(markers: readonly MonacoMarkerLike[]): void;
  setTheme(theme: string): void;
  dispose(): void;
}

export interface CodeViewer {
  editor: monaco.editor.IStandaloneCodeEditor;
  setValue(value: string): void;
  setTheme(theme: string): void;
  setLanguage(language: string): void;
  dispose(): void;
}

export interface CreateOptionEditorOptions {
  initialCode: string;
  language?: string;
  onChange?: (code: string) => void;
  theme?: string;
}

export interface CreateCodeViewerOptions {
  initialCode: string;
  language?: string;
  theme?: string;
}

const MARKER_OWNER = "ve-codegen-option";

export function createOptionEditor(
  container: HTMLElement,
  { initialCode, language = "typescript", onChange, theme = "vs" }: CreateOptionEditorOptions,
): OptionEditor {
  monaco.editor.setTheme(theme);

  const editor = monaco.editor.create(container, {
    value: initialCode,
    language,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    fontSize: 13,
    lineHeight: 20,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: "on",
  });

  const disposables: monaco.IDisposable[] = [];

  if (onChange) {
    disposables.push(
      editor.onDidChangeModelContent(() => {
        const model = editor.getModel();
        if (!model) {
          return;
        }
        onChange(model.getValue());
      }),
    );
  }

  function getValue() {
    return editor.getValue();
  }

  function setValue(value: string) {
    const model = editor.getModel();
    if (!model) {
      return;
    }
    if (model.getValue() !== value) {
      model.setValue(value);
    }
  }

  function setMarkers(markers: readonly MonacoMarkerLike[]) {
    const model = editor.getModel();
    if (!model) {
      return;
    }
    const mapped = markers.map((marker) => ({
      ...marker,
      severity: marker.severity ? SEVERITY_MAP[marker.severity] : monaco.MarkerSeverity.Error,
    }));
    monaco.editor.setModelMarkers(model, MARKER_OWNER, mapped);
  }

  function dispose() {
    disposables.forEach((item) => item.dispose());
    disposables.length = 0;
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
    }
    editor.dispose();
  }

  function setTheme(nextTheme: string) {
    monaco.editor.setTheme(nextTheme);
  }

  return {
    editor,
    getValue,
    setValue,
    setMarkers,
    setTheme,
    dispose,
  };
}

export function createCodeViewer(
  container: HTMLElement,
  { initialCode, language = "javascript", theme = "vs" }: CreateCodeViewerOptions,
): CodeViewer {
  monaco.editor.setTheme(theme);

  const editor = monaco.editor.create(container, {
    value: initialCode,
    language,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    fontSize: 13,
    lineHeight: 20,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: "on",
    readOnly: true,
    renderLineHighlight: "none",
  });

  function setValue(value: string) {
    const model = editor.getModel();
    if (!model) {
      return;
    }
    if (model.getValue() !== value) {
      model.setValue(value);
    }
  }

  function setTheme(nextTheme: string) {
    monaco.editor.setTheme(nextTheme);
  }

  function setLanguage(nextLanguage: string) {
    const model = editor.getModel();
    if (!model) {
      return;
    }
    monaco.editor.setModelLanguage(model, nextLanguage);
  }

  function dispose() {
    editor.dispose();
  }

  return {
    editor,
    setValue,
    setTheme,
    setLanguage,
    dispose,
  };
}

export { monaco };
export type MonacoNamespace = typeof monaco;
