import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, expect, it } from "vitest";

// Resolve the dependencies actually used by the browser test tooling.
const require = createRequire(import.meta.url);
const browserVueRequire = createRequire(require.resolve("vitest-browser-vue"));
const testUtilsRequire = createRequire(browserVueRequire.resolve("@vue/test-utils"));
const beautifyRequire = createRequire(testUtilsRequire.resolve("js-beautify"));
let fixture: string;

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), "vue-echarts-dev-deps-"));
});
afterEach(() => rmSync(fixture, { recursive: true, force: true }));

it("preserves recursive wildcard matching and ignores in js-beautify's glob dependency", async () => {
  const { globSync } = await import(pathToFileURL(beautifyRequire.resolve("glob")).href);
  for (const directory of ["src", "src/nested", "node_modules"]) {
    mkdirSync(join(fixture, directory), { recursive: true });
  }
  for (const file of ["src/a.ts", "src/nested/b.vue", "src/c.js", "node_modules/skip.ts"]) {
    writeFileSync(join(fixture, file), "");
  }

  expect(
    globSync("**/*.{ts,vue}", { cwd: fixture, ignore: ["**/node_modules/**"] }).sort(),
  ).toEqual(["src/a.ts", "src/nested/b.vue"]);
});

it("preserves EditorConfig section matching in js-beautify's editorconfig dependency", async () => {
  const { parseSync } = await import(pathToFileURL(beautifyRequire.resolve("editorconfig")).href);
  writeFileSync(
    join(fixture, ".editorconfig"),
    "root = true\n\n[*]\nindent_style = space\n\n[*.{ts,vue}]\nindent_size = 2\n",
  );

  expect(parseSync(join(fixture, "src", "chart.vue"))).toMatchObject({
    indent_style: "space",
    indent_size: 2,
  });
  expect(parseSync(join(fixture, "src", "chart.js"))).not.toHaveProperty("indent_size");
});
