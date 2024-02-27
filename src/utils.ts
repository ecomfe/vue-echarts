import { unref } from "vue-demi";
import type { Injection } from "./types";
import { allEvents } from "./events";

type Attrs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

// Copied from
// https://github.com/vuejs/vue-next/blob/5a7a1b8293822219283d6e267496bec02234b0bc/packages/shared/src/index.ts#L40-L41
const onRE = /^on[^a-z]/;
export const isOn = (key: string): boolean => onRE.test(key);

function attrToEvent(attr: string) {
  // onClick    -> c + lick
  // onZr:click -> z + r:click
  let event = attr.charAt(2).toLowerCase() + attr.slice(3);

  // clickOnce    -> click
  // zr:clickOnce -> zr:click
  if (event.substring(event.length - 4) === "Once") {
    event = event.substring(0, event.length - 4);
  }
  return event;
}

export function omitEChartsEvents(attrs: Attrs): Attrs {
  const result: Attrs = {};
  for (const key in attrs) {
    if (!isOn(key) || !allEvents.includes(attrToEvent(key))) {
      result[key] = attrs[key];
    }
  }

  return result;
}

export function unwrapInjected<T, V>(
  injection: Injection<T>,
  defaultValue: V
): T | V {
  const value = unref(injection);

  if (value && typeof value === "object" && "value" in value) {
    return value.value || defaultValue;
  }

  return value || defaultValue;
}
