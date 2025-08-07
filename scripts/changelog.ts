import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Extract the changelog section for the given version from CHANGELOG.md
 * and print it to stdout (without leading/trailing blank lines).
 *
 * Usage:
 *   npx jiti scripts/changelog.ts 7.0.3 > tmp_release_body.md
 */

const version = process.argv[2];

if (!version) {
  console.error("Usage: jiti scripts/changelog.ts <version>");
  process.exit(1);
}

const header = `## ${version}`;
const changelogPath = join(process.cwd(), "CHANGELOG.md");
const lines = readFileSync(changelogPath, "utf8").split(/\r?\n/);

let capturing = false;
const section: string[] = [];

for (const line of lines) {
  if (line.startsWith("## ")) {
    if (capturing) break; // reached next version header
    if (line.trim() === header) {
      capturing = true; // start capturing after header
      continue; // skip header line itself
    }
  }
  if (capturing) section.push(line);
}

// Trim leading / trailing blank lines
while (section.length && section[0].trim() === "") section.shift();
while (section.length && section[section.length - 1].trim() === "")
  section.pop();

if (section.length === 0) {
  console.error(`No changelog entry found for version ${version}`);
  process.exit(1);
}

console.log(section.join("\n"));
