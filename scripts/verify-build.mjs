#!/usr/bin/env node
/**
 * Post-build sanity check (runs automatically after `npm run build`).
 *
 * Next.js resolves the App Router folder as the FIRST existing one of
 * `app/`, `src/app/`. A stray top-level `app/` directory (for example a Python
 * package from another project uploaded into the same Space) silently wins over
 * `src/app/`, so the build "succeeds" with only the 404 page and every route
 * returns `404: This page could not be found.`
 *
 * This script turns that silent failure into a loud one, and tells you exactly
 * which folder to rename/remove.
 */
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");

const fail = (lines) => {
  console.error("\n\u001b[31m✖ Build verification failed\u001b[0m");
  for (const line of lines) console.error("  " + line);
  console.error("");
  process.exit(1);
};

if (!existsSync(nextDir)) fail(["`.next/` is missing — did the build run?"]);

// 1) App Router output must contain our real pages, not just the 404 shell.
const appOutput = path.join(nextDir, "server", "app");
const hasAppOutput = existsSync(appOutput);
const hasHomeRoute = existsSync(path.join(appOutput, "page.js"));
const hasApiRoutes = existsSync(path.join(appOutput, "api"));
const hasDashboard = existsSync(path.join(appOutput, "dashboard"));

if (!hasAppOutput || !hasHomeRoute) {
  const strayApp = existsSync(path.join(root, "app"));
  const straySrcApp = existsSync(path.join(root, "src", "app"));
  const lines = [
    "The App Router output is empty: no home page was compiled.",
    `  expected: ${path.relative(root, path.join(appOutput, "page.js"))}`,
    `  src/app/ exists: ${straySrcApp}`,
    `  app/ exists    : ${strayApp}`,
  ];
  if (strayApp) {
    lines.push(
      "",
      "A top-level `app/` folder shadows `src/app/` and Next.js picked it instead.",
      "Rename or delete that folder (for example `app/` -> `pyapp/`) and rebuild.",
    );
  }
  fail(lines);
}

if (!hasApiRoutes || !hasDashboard) {
  fail([
    "Some routes are missing from the build:",
    `  app/api/ compiled : ${hasApiRoutes}`,
    `  app/dashboard/    : ${hasDashboard}`,
    "Remove any stray top-level `app/` folder and rebuild.",
  ]);
}

// 2) A silent 404 usually also means the middleware/proxy was not emitted.
const hasProxy = [
  path.join(nextDir, "server", "middleware.js"),
  path.join(nextDir, "server", "proxy.js"),
  path.join(nextDir, "middleware.js"),
  path.join(nextDir, "proxy.js"),
].some((f) => existsSync(f));
const routes = readdirSync(appOutput, { withFileTypes: true })
  .filter((e) => e.isDirectory() || e.name.endsWith(".js"))
  .length;

console.log(
  `\u001b[32m✔\u001b[0m build verified — ${routes} app-router entries` +
    `, proxy: ${hasProxy ? "yes" : "no"}`,
);
