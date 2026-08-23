import { ensureStyles } from "./style";
import { isBrowser } from "./utils";

let registered = new WeakSet<CustomElementRegistry>();

export const TAG_NAME = "x-vue-echarts";

export interface EChartsElement extends HTMLElement {
  __dispose: (() => void) | null;
}

export function register(root?: Element): boolean {
  const realm = root?.ownerDocument.defaultView ?? globalThis;
  const registry = realm.customElements;

  if (!isBrowser() || !registry?.get) {
    return false;
  }

  if (registered.has(registry)) {
    return true;
  }

  if (!registry.get(TAG_NAME)) {
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
              this.__dispose();
              this.__dispose = null;
            }
          });
        }
      }

      registry.define(TAG_NAME, ECElement);
    } catch {
      if (!registry.get(TAG_NAME)) {
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
