/** Resolve npm dist-tag from a semver string.
 *  Usage:  jiti scripts/dist-tag.ts 1.2.3-beta.0  # → beta
 *          jiti scripts/dist-tag.ts               # picks version from package.json
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Prefer CLI arg, otherwise read package.json
const version: string =
  process.argv[2] ?? JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")).version;

const prerelease = version.split("+", 1)[0].match(/-(.+)$/)?.[1];
const tag = prerelease
  ?.split(".")
  .find((identifier) => /\D/.test(identifier))
  ?.toLowerCase();

if (prerelease && !tag) {
  throw new Error(`Cannot derive npm dist-tag from numeric prerelease "${prerelease}".`);
}

console.log(tag ?? "latest");
