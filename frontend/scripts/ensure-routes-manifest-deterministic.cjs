const fs = require("node:fs");
const path = require("node:path");

function ensureDeterministicManifest() {
  const nextDir = path.join(process.cwd(), ".next");
  const deterministicPath = path.join(
    nextDir,
    "routes-manifest-deterministic.json",
  );
  const routesPath = path.join(nextDir, "routes-manifest.json");

  if (!fs.existsSync(nextDir)) {
    console.warn(
      "[ensure-routes-manifest-deterministic] .next not found; skipping.",
    );
    return;
  }

  if (fs.existsSync(deterministicPath)) return;

  if (fs.existsSync(routesPath)) {
    fs.copyFileSync(routesPath, deterministicPath);
    console.log(
      "[ensure-routes-manifest-deterministic] created from routes-manifest.json",
    );
    return;
  }

  fs.writeFileSync(
    deterministicPath,
    JSON.stringify({ version: 3, routes: {} }, null, 2),
    "utf8",
  );
  console.log(
    "[ensure-routes-manifest-deterministic] created fallback manifest",
  );
}

ensureDeterministicManifest();
