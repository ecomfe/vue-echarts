import { readFileSync, writeFileSync } from "node:fs";
import { commentMark } from "comment-mark";
import { getPackageMeta, resolvePath, getVersions } from "./utils.js";

const { name, version, devDependencies } = getPackageMeta();

const CDN_PREFIX = "https://cdn.jsdelivr.net/npm/";

const DEP_VERSIONS = {
  ...getVersions(["vue", "echarts"], devDependencies),
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

function getCodeBlock(code) {
  return "\n```html\n" + code + "\n```\n";
}

const README_FILES = ["README.md", "README.zh-Hans.md"].map((name) =>
  resolvePath(import.meta.url, "..", name),
);

README_FILES.forEach((file) => {
  const content = readFileSync(file, "utf8");

  writeFileSync(
    file,
    commentMark(content, {
      vue3Scripts: getCodeBlock(getScripts()),
    }),
    "utf8",
  );
});

console.log("README files updated.");
