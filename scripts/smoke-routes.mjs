import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = Number(process.env.SMOKE_PORT || 8080);
const baseUrl = `http://${host}:${port}`;
const routes = [
  "/",
  "/assessment",
  "/clinics",
  "/shared/treatment-plan/share_sofia_upper",
  "/pro/dashboard",
  "/pro/leads",
  "/pro/patients",
  "/pro/treatment-plans",
  "/dentalplan?treatmentPlanId=tp_1",
  "/pro/tasks",
  "/pro/appointments",
  "/pro/communication",
  "/pro/reports",
  "/pro/settings",
  "/shared/treatment-plan/invalid-token",
  "/pro/patients/invalid-id",
  "/pro/treatment-plans/invalid-id",
];
const fatalPatterns = [
  "Internal Server Error",
  "Maximum update depth exceeded",
  "getSnapshot should be cached",
  "Cannot redefine property: process",
];
const output = [];
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "dev", "--host", host, "--port", String(port), "--strictPort"],
  { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
);
server.stdout.on("data", (chunk) => output.push(chunk.toString()));
server.stderr.on("data", (chunk) => output.push(chunk.toString()));

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error("The dev server exited before becoming ready.");
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Startup polling is expected to fail until Vite is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the dev server.");
}

try {
  await waitForServer();
  let failed = false;
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`);
    const body = await response.text();
    const fatal = fatalPatterns.find((pattern) => body.includes(pattern));
    const ok = response.status < 500 && !fatal;
    const finalUrl = new URL(response.url);
    const destination = `${finalUrl.pathname}${finalUrl.search}`;
    console.log(
      `${ok ? "PASS" : "FAIL"} ${response.status} ${route}${destination !== route ? ` -> ${destination}` : ""}`,
    );
    if (!ok) failed = true;
  }
  if (failed) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(output.slice(-20).join(""));
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
