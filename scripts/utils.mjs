import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function resolvePath(url, ...parts) {
  return resolve(dirname(fileURLToPath(url)), ...parts);
}

export function getPackageMeta() {
  return JSON.parse(
    readFileSync(resolvePath(import.meta.url, "../package.json"), "utf8"),
  );
}
