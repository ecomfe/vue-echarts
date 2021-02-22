import fs from "fs";
import { resolve } from "path";
import commentMark from "comment-mark";
import { name, version } from "../package.json";

const { readFile, writeFile } = fs.promises;

const CDN_PREFIX = "https://cdn.jsdelivr.net/npm/";

const DEP_VERSIONS = {
  "vue@3": "3.0.5",
  "vue@2": "2.6.12",
  "vue-demi": "0.6.0",
  "@vue/composition-api": "1.0.0-rc.2",
  echarts: "5.0.2",
  [name]: version
};

function getScripts(deps) {
  return deps
    .map(dep => {
      const [, name] = dep.match(/^(.+?)(?:@.+)?$/) || [];
      return `<script src="${CDN_PREFIX}${name}@${DEP_VERSIONS[dep]}"></script>`;
    })
    .join("\n");
}

const README_FILES = ["README.md", "README.zh-Hans.md"].map(name =>
  resolve(__dirname, "..", name)
);

const markConfig = {
  vue3Scripts: ["vue@3", "vue-demi", "echarts", name],
  vue2Scripts: ["vue@2", "@vue/composition-api", "vue-demi", "echarts", name]
};

function exec() {
  return Promise.all(
    README_FILES.map(async file => {
      const content = await readFile(file, "utf-8");

      writeFile(
        file,
        commentMark(content, {
          vue2Scripts: getScripts(markConfig["vue2Scripts"]),
          vue3Scripts: getScripts(markConfig["vue3Scripts"])
        }),
        "utf-8"
      );
    })
  );
}

async function main() {
  await exec();
  console.log("README files updated.");
}

main();
