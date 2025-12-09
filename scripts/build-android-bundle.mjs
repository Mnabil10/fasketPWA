#!/usr/bin/env node
/**
 * Builds the production web assets, syncs them to the Android project, and runs a release bundle build.
 * Works on Windows (gradlew.bat) and Unix (./gradlew).
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const isWindows = process.platform === "win32";
const androidDir = join(process.cwd(), "android");
const gradleCommand = isWindows ? "gradlew.bat" : "./gradlew";

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: isWindows,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npm", ["run", "build"], process.cwd());
run("npx", ["cap", "sync", "android"], process.cwd());
run(gradleCommand, ["bundleRelease"], androidDir);
