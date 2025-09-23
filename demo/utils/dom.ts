export const isClient = typeof window !== "undefined";

let cachedScrollbarWidth: number | null = null;

export function getScrollLockTarget(): HTMLElement | null {
  return isClient ? document.body : null;
}

export function setHash(hash: string): void {
  if (!isClient) {
    return;
  }
  const value = hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "";
  if (window.location.hash === value) {
    return;
  }
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}${value}`);
}

export function getScrollbarWidth(): number {
  if (!isClient) {
    return 0;
  }
  if (cachedScrollbarWidth !== null) {
    return cachedScrollbarWidth;
  }

  const root = document.documentElement;
  const direct = Math.abs(window.innerWidth - root.clientWidth);
  if (direct > 0) {
    cachedScrollbarWidth = direct;
    return cachedScrollbarWidth;
  }

  const probe = document.createElement("div");
  Object.assign(probe.style, {
    position: "absolute",
    top: "-9999px",
    width: "100px",
    height: "100px",
    overflow: "scroll",
    visibility: "hidden",
    pointerEvents: "none",
  });

  const rootScrollbarWidth =
    getComputedStyle(root).getPropertyValue("scrollbar-width");
  if (rootScrollbarWidth) {
    probe.style.setProperty("scrollbar-width", rootScrollbarWidth);
  }

  root.appendChild(probe);
  const width = probe.offsetWidth - probe.clientWidth;
  root.removeChild(probe);

  cachedScrollbarWidth = width;
  return cachedScrollbarWidth;
}
