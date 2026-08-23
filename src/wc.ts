import { ensureStyles } from "./style";
import { isBrowser } from "./utils";

let registered: boolean | null = null;

export const TAG_NAME = "x-vue-echarts";

export interface EChartsElement extends HTMLElement {
  __dispose: (() => void) | null;
}

export function register(): boolean {
  if (registered != null) {
    return registered;
  }

  const registry = globalThis.customElements;

  if (!isBrowser() || !registry?.get) {
    return false;
  }

  if (!registry.get(TAG_NAME)) {
    try {
      class ECElement extends HTMLElement implements EChartsElement {
        __dispose: (() => void) | null = null;

        connectedCallback(): void {
          ensureStyles(this.getRootNode());
        }

        disconnectedCallback(): void {
          queueMicrotask(() => {
            if (!this.isConnected && this.__dispose) {
              this.__dispose();
              this.__dispose = null;
            }
          });
        }
      }

      registry.define(TAG_NAME, ECElement);
    } catch {
      registered = Boolean(registry.get(TAG_NAME));
      return registered;
    }
  }

  registered = true;
  return registered;
}

// Test helper to reset cached registration state.
export function __resetRegisterState(): void {
  registered = null;
}
