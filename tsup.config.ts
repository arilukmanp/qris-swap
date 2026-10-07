import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  target: "es2022",
  clean: true,
  sourcemap: false,
  esbuildOptions(options) {
    // Resolve dependencies with "import"/"require" conditions only (no "node" condition)
    // so runtime-universal builds of vendored deps are bundled — no Node built-in imports
    // (e.g. fflate's node-only worker_threads path). Keeps dist runnable everywhere.
    options.platform = "neutral";
  },
  noExternal: ["uqr", "fast-png", "fflate", "iobuffer", "jpeg-js", "jsqr"],
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
