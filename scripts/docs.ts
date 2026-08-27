import { readFileSync, writeFileSync } from "node:fs";
import { commentMark } from "comment-mark";
import { getPackageVersions, resolvePath } from "./utils";

const DOC_DEPENDENCIES = ["echarts", "vue"];
const { name, version, devDependencies } = getPackageVersions(DOC_DEPENDENCIES);

const CDN_PREFIX = "https://cdn.jsdelivr.net/npm/";

const DEP_VERSIONS = {
  ...Object.fromEntries(DOC_DEPENDENCIES.map((name) => [name, devDependencies[name].version])),
  [name]: version,
};

function getScripts() {
  return Object.entries(DEP_VERSIONS)
    .map(([dep, version]) => {
      const [, name] = dep.match(/^(.+?)(?:@.+)?$/) || [];
      return `<script src="${CDN_PREFIX}${name}@${version}"></script>`;
    })
    .join("\n");
}

function getCodeBlock(code: string) {
  return "\n```html\n" + code + "\n```\n";
}

const README_FILES = ["README.md", "README.zh-Hans.md"].map((name) =>
  resolvePath(import.meta.url, "..", name),
);
const scripts = getCodeBlock(getScripts());

for (const file of README_FILES) {
  const content = readFileSync(file, "utf8");
  const nextContent = commentMark(content, { scripts });

  if (nextContent !== content) {
    writeFileSync(file, nextContent, "utf8");
  }
}

console.log("README files are up to date.");
