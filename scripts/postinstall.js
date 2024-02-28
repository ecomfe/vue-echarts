/* eslint-disable @typescript-eslint/no-var-requires */
import path from "node:path";
import fs from "node:fs";

const packageFile = path.resolve(__dirname, "../package.json");

const typesPaths = {
  3: "dist/index.d.ts",
  2.7: "dist/index.vue2_7.d.ts",
  2: "dist/index.vue2.d.ts"
};

function switchVersion(version) {
  const typesPath = typesPaths[version];
  const pkg = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  if (typesPath !== pkg.types) {
    pkg.types = typesPath;
    fs.writeFileSync(packageFile, JSON.stringify(pkg, null, "  "), "utf8");
  }
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
    switchVersion(2.7);
  } else if (Vue.version.startsWith("2.")) {
    switchVersion(2);
  } else {
    console.warn(`[vue-echarts] Vue version v${Vue.version} is not supported.`);
  }
}

main();
