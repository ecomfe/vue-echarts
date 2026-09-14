import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright";

const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL("..", import.meta.url)),
  logLevel: "error",
  server: { host: "127.0.0.1", port: 0 },
  plugins: [
    {
      name: "graphic-benchmark",
      configureServer(server) {
        server.middlewares.use("/__benchmark__", (_request, response) => {
          response.setHeader("Content-Type", "text/html");
          response.end("<!doctype html><html><body></body></html>");
        });
      },
    },
  ],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${server.resolvedUrls.local[0]}__benchmark__`);
  const results = await page.evaluate(async () => {
    const { run } = await import("/benchmarks/graphic.ts");
    return run();
  });
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
