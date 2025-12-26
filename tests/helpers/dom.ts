import { vi } from "vitest";

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

export function resetDocumentBody(): void {
  document.body.innerHTML = "";
}
