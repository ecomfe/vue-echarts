/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const fs = require("fs");

const packageFile = path.resolve(__dirname, "../package.json");

const typesPaths = {
  3: "dist/index.d.ts",
  2: "dist/index.vue2.d.ts"
};

function switchVersion(version) {
  const typesPath = typesPaths[version];
  const package = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  if (typesPath !== package.types) {
    package.types = typesPath;
    fs.writeFileSync(packageFile, JSON.stringify(package, null, "  "), "utf8");
  }
  console.log(`[vue-echarts] Switched to Vue ${version} environment.`);
}

function loadVue() {
  try {
    return require("vue");
  } catch (e) {
    return null;
  }
}

const Vue = loadVue();

// Align the process with vue-demi
if (!Vue || typeof Vue.version !== "string") {
  console.warn(
    '[vue-echarts] Vue is not found. Please run "npm install vue" to install.'
  );
} else if (Vue.version.startsWith("3.")) {
  switchVersion(3);
} else if (Vue.version.startsWith("2.")) {
  switchVersion(2);
} else {
  console.warn(`[vue-echarts] Vue version v${Vue.version} is not supported.`);
}
