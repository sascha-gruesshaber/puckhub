#!/usr/bin/env node
// Tag and push local Docker images to GHCR.
//
// Usage:
//   node scripts/docker-push.mjs                  # push :local as :latest
//   node scripts/docker-push.mjs local v1.2.3     # push :local as :v1.2.3

import { execSync } from "node:child_process"

const quiet = (cmd) => execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim()
const run = (cmd) => execSync(cmd, { stdio: "inherit" })

const registry = process.env.REGISTRY || "ghcr.io"
const namespace = process.env.NAMESPACE || "sascha-gruesshaber"
const sourceTag = process.argv[2] || "local"
const pushTags = process.argv.length > 3 ? process.argv.slice(3) : ["latest"]

const images = ["puckhub-api", "puckhub-admin", "puckhub-platform", "puckhub-league-site", "puckhub-marketing-site"]

console.log(`Registry:   ${registry}/${namespace}`)
console.log(`Source tag:  ${sourceTag}`)
console.log(`Push tags:   ${pushTags.join(", ")}\n`)

// Check images exist
for (const img of images) {
  try {
    quiet(`docker image inspect ${img}:${sourceTag}`)
  } catch {
    console.error(`Image ${img}:${sourceTag} not found. Run: pnpm docker:build`)
    process.exit(1)
  }
}

// Tag and push
for (const img of images) {
  for (const tag of pushTags) {
    const remote = `${registry}/${namespace}/${img}:${tag}`
    console.log(`  ${img}:${sourceTag} -> ${remote}`)
    run(`docker tag ${img}:${sourceTag} ${remote}`)
    run(`docker push ${remote}`)
  }
}

console.log("\nAll images pushed successfully.")
