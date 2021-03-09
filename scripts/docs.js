import fs from "fs";
import { resolve } from "path";
import commentMark from "comment-mark";
import { getParameters } from "codesandbox/lib/api/define";
import { name, version } from "../package.json";

const { readFile, writeFile } = fs.promises;

const CDN_PREFIX = "https://cdn.jsdelivr.net/npm/";

const DEP_VERSIONS = {
  "vue@3": "3.0.7",
  "vue@2": "2.6.12",
  "@vue/composition-api": "1.0.0-rc.3",
  echarts: "5.0.2",
  [name]: version
};

const markConfig = {
  vue3Scripts: ["vue@3", "echarts", name],
  vue2Scripts: ["vue@2", "@vue/composition-api", "echarts", name]
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

async function getSandboxParams(version) {
  const [html, js, css] = await Promise.all(
    ["index.html", `vue${version}.js`, "index.css"].map(async name => {
      const file = resolve(__dirname, `./sandbox/${name}`);
      return readFile(file, "utf8");
    })
  );
  return {
    files: {
      "index.html": {
        content: `<!DOCTYPE html>
<html>
<head>
<style>
${css}</style>
</head>
<body>
${html}${scripts[version]}
<script>
${js}</script>
</body>
</html>`
      }
    }
  };
}

async function getDemoLink(version) {
  const parameters = getParameters(await getSandboxParams(version));
  return `[Demo →](${`https://codesandbox.io/api/v1/sandboxes/define?parameters=${parameters}`})`;
}

const README_FILES = ["README.md", "README.zh-Hans.md"].map(name =>
  resolve(__dirname, "..", name)
);

function exec() {
  return Promise.all(
    README_FILES.map(async file => {
      const content = await readFile(file, "utf8");

      const [link2, link3] = await Promise.all([2, 3].map(getDemoLink));

      return writeFile(
        file,
        commentMark(content, {
          vue2Scripts: getCodeBlock(scripts[2]),
          vue3Scripts: getCodeBlock(scripts[3]),
          vue2Demo: `\n${link2}\n`,
          vue3Demo: `\n${link3}\n`
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
