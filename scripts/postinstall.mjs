import { readFileSync, writeFileSync } from "node:fs";
import { resolvePath } from "./utils.mjs";

function resolveDist(...paths) {
  return resolvePath(import.meta.url, "../dist", ...paths);
}

const typesSource = {
  3: "index.vue3.d.ts",
  2: "index.vue2.d.ts"
};

const typesTargets = [
  "index.d.ts",
  "index.d.cts",
  "csp/index.d.ts",
  "csp/index.d.cts"
];

function switchVersion(version) {
  const source = typesSource[version];
  const content = readFileSync(resolveDist(source), "utf8");

  typesTargets.forEach(target => {
    writeFileSync(resolveDist(target), content, "utf8");
  });

  console.log(`[vue-echarts] Switched to Vue ${version} environment.`);
}

async function loadVue() {
  try {
    const Vue = await import("vue");
    return Vue;
  } catch (e) {
    return null;
  }
}

async function main() {
  const Vue = await loadVue();

  // Align the process with vue-demi
  if (!Vue || typeof Vue.version !== "string") {
    console.warn(
      '[vue-echarts] Vue is not found. Please run "npm install vue" to install.'
    );
  } else if (Vue.version.startsWith("3.")) {
    switchVersion(3);
  } else if (Vue.version.startsWith("2.7.")) {
    switchVersion(2);
  } else {
    console.warn(`[vue-echarts] Vue version v${Vue.version} is not supported.`);
  }
}

main();
