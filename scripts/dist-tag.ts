/** Resolve npm dist-tag from a semver string.
 *  Usage:  jiti scripts/dist-tag.ts 1.2.3-beta.0  # → beta
 *          jiti scripts/dist-tag.ts               # picks version from package.json
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Prefer CLI arg, otherwise read package.json
const version: string =
  process.argv[2] ??
  JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")).version;

// Capture first recognised prerelease label
const tag =
  version.match(/-(alpha|beta|rc)\b/i)?.[1].toLowerCase() ?? "latest";

console.log(tag);
