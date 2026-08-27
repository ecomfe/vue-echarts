import { ensureStyles } from "./style";

let registered = new WeakSet<CustomElementRegistry>();

export const TAG_NAME = "x-vue-echarts";
// Shared across bundles so one copy can trust another copy's disconnect hook.
const LIFECYCLE_MARKER = Symbol.for("vue-echarts.lifecycle");

type LifecycleConstructor = CustomElementConstructor & {
  [LIFECYCLE_MARKER]?: true;
};

export interface EChartsElement extends HTMLElement {
  __dispose: (() => void) | null;
}

function supportsLifecycle(ctor: CustomElementConstructor | undefined): boolean {
  return Boolean((ctor as LifecycleConstructor | undefined)?.[LIFECYCLE_MARKER]);
}

export function register(root?: Element): boolean {
  const realm = root ? root.ownerDocument.defaultView : globalThis;
  const registry = realm?.customElements;

  if (!realm || !registry?.get) {
    return false;
  }

  if (registered.has(registry)) {
    return true;
  }

  const existing = registry.get(TAG_NAME);
  if (existing && !supportsLifecycle(existing)) {
    return false;
  }
  if (!existing) {
    try {
      class ECElement extends realm.HTMLElement implements EChartsElement {
        __dispose: (() => void) | null = null;

        connectedCallback(): void {
          ensureStyles(this.getRootNode());
        }

        disconnectedCallback(): void {
          if (!this.__dispose) {
            return;
          }
          queueMicrotask(() => {
            if (!this.isConnected && this.__dispose) {
              const dispose = this.__dispose;
              this.__dispose = null;
              dispose();
            }
          });
        }
      }

      Object.defineProperty(ECElement, LIFECYCLE_MARKER, { value: true });
      registry.define(TAG_NAME, ECElement);
    } catch {
      if (!supportsLifecycle(registry.get(TAG_NAME))) {
        return false;
      }
    }
  }

  registered.add(registry);
  return true;
}

// Test helper to reset cached registration state.
export function __resetRegisterState(): void {
  registered = new WeakSet();
}
