#!/usr/bin/env node
// Build all PuckHub Docker images locally.
// Usage: node scripts/docker-build.mjs [TAG]

import { execSync } from "node:child_process"

const tag = process.argv[2] || "local"
const vcsRef = (() => {
  try { return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim() }
  catch { return "unknown" }
})()
const buildDate = new Date().toISOString()

const targets = [
  { app: "api", target: "api-runner" },
  { app: "admin", target: "admin-runner" },
  { app: "platform", target: "platform-runner" },
  { app: "league-site", target: "league-site-runner" },
]

console.log(`Building PuckHub Docker images (tag: ${tag})...\n`)

for (const { app, target } of targets) {
  const image = `puckhub-${app}:${tag}`
  console.log(`━━━ Building ${image} (target: ${target}) ━━━`)
  execSync(
    `docker build --target ${target} --tag ${image} --build-arg BUILD_DATE=${buildDate} --build-arg VCS_REF=${vcsRef} --build-arg VERSION=${tag} .`,
    { stdio: "inherit" },
  )
  console.log()
}

console.log("All images built:")
execSync(`docker images --filter "reference=puckhub-*:${tag}" --format "table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}"`, { stdio: "inherit" })
