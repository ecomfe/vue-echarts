import { readFileSync, writeFileSync } from "node:fs";
import commentMark from "comment-mark";
import { getPackageMeta, resolvePath } from "./utils.mjs";

const { name, version } = getPackageMeta();

const CDN_PREFIX = "https://cdn.jsdelivr.net/npm/";

const DEP_VERSIONS = {
  vue: "3.5.13",
  echarts: "5.5.1",
  [name]: version,
};

function getScripts() {
  const deps = ["vue", "echarts", name];
  return deps
    .map((dep) => {
      const [, name] = dep.match(/^(.+?)(?:@.+)?$/) || [];
      return `<script src="${CDN_PREFIX}${name}@${DEP_VERSIONS[dep]}"></script>`;
    })
    .join("\n");
}

function getCodeBlock(code) {
  return "```html\n" + code + "\n```";
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
