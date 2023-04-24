const fs = require("fs");
const { resolve } = require("path");
const commentMark = require("comment-mark");
const { name, version } = require("../package.json");

const { readFile, writeFile } = fs.promises;

const CDN_PREFIX = "https://cdn.jsdelivr.net/npm/";

const DEP_VERSIONS = {
  "vue@3": "3.2.47",
  "vue@2": "2.7.14",
  echarts: "5.4.2",
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
  resolve(__dirname, "..", name)
);

function exec() {
  return Promise.all(
    README_FILES.map(async file => {
      const content = await readFile(file, "utf8");

      return writeFile(
        file,
        commentMark(content, {
          vue2Scripts: getCodeBlock(scripts[2]),
          vue3Scripts: getCodeBlock(scripts[3])
        }),
        "utf8"
      );
    })
  );
}

async function main() {
  await exec();
  console.log("README files updated.");
}

main();
