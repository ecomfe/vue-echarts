import { vi } from "vitest";

export function createFrame() {
  const iframe = document.body.appendChild(document.createElement("iframe"));
  const ownerDocument = iframe.contentDocument;
  const ownerWindow = ownerDocument?.defaultView;
  if (!ownerDocument || !ownerWindow) {
    throw new Error("Expected iframe realm to be available.");
  }
  return { iframe, ownerDocument, ownerWindow };
}

export function createSizedContainer(width = 100, height = 100): HTMLDivElement {
  const element = document.createElement("div");
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.display = "block";
  element.style.position = "relative";
  document.body.appendChild(element);
  return element;
}

export async function flushAnimationFrame(): Promise<void> {
  await Promise.resolve();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await Promise.resolve();
}

export function withConsoleWarn<T>(callback: (warnSpy: ReturnType<typeof vi.spyOn>) => T): T {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  try {
    return callback(warnSpy);
  } finally {
    warnSpy.mockRestore();
  }
}

export async function withConsoleWarnAsync<T>(
  callback: (warnSpy: ReturnType<typeof vi.spyOn>) => Promise<T>,
): Promise<T> {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  try {
    return await callback(warnSpy);
  } finally {
    warnSpy.mockRestore();
  }
}

export function resetDocumentBody(): void {
  document.body.innerHTML = "";
}
