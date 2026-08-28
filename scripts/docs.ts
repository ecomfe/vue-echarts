import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { commentMark } from "comment-mark";
import { getPackageVersions } from "./utils";

const DOC_DEPENDENCIES = ["echarts", "vue"];
const { name, version, devDependencies } = getPackageVersions(DOC_DEPENDENCIES);

const CDN_PREFIX = "https://cdn.jsdelivr.net/npm/";

const DEP_VERSIONS = {
  ...Object.fromEntries(DOC_DEPENDENCIES.map((name) => [name, devDependencies[name].version])),
  [name]: version,
};

const scriptTags = Object.entries(DEP_VERSIONS)
  .map(([packageName, version]) => `<script src="${CDN_PREFIX}${packageName}@${version}"></script>`)
  .join("\n");
const scripts = `\n\`\`\`html\n${scriptTags}\n\`\`\`\n`;

const README_FILES = ["../README.md", "../README.zh-Hans.md"].map((name) =>
  fileURLToPath(new URL(name, import.meta.url)),
);

for (const file of README_FILES) {
  const content = readFileSync(file, "utf8");
  const nextContent = commentMark(content, { scripts });

  if (nextContent !== content) {
    writeFileSync(file, nextContent, "utf8");
  }
}

console.log("README files are up to date.");
