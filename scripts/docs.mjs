import { readFileSync, writeFileSync } from "node:fs";
import commentMark from "comment-mark";
import { getPackageMeta, resolvePath } from "./utils.mjs";

const { name, version } = getPackageMeta();

const CDN_PREFIX = "https://cdn.jsdelivr.net/npm/";

const DEP_VERSIONS = {
  "vue@3": "3.4.33",
  "vue@2": "2.7.16",
  echarts: "5.5.1",
  [name]: version
};

const markConfig = {
  vue3Scripts: ["vue@3", "echarts", name],
  vue2Scripts: ["vue@2", "echarts", name]
};

function getScripts(version) {
  const deps = markConfig[`vue${version}Scripts`];
  return deps
    .map(dep => {
      const [, name] = dep.match(/^(.+?)(?:@.+)?$/) || [];
      return `<script src="${CDN_PREFIX}${name}@${DEP_VERSIONS[dep]}"></script>`;
    })
    .join("\n");
}

function getCodeBlock(code) {
  return "```html\n" + code + "\n```";
}

const scripts = {
  2: getScripts(2),
  3: getScripts(3)
};

const README_FILES = ["README.md", "README.zh-Hans.md"].map(name =>
  resolvePath(import.meta.url, "..", name)
);

README_FILES.forEach(file => {
  const content = readFileSync(file, "utf8");

  writeFileSync(
    file,
    commentMark(content, {
      vue2Scripts: getCodeBlock(scripts[2]),
      vue3Scripts: getCodeBlock(scripts[3])
    }),
    "utf8"
  );
});

console.log("README files updated.");
