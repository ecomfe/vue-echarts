import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function resolvePath(url: string, ...parts: string[]) {
  return resolve(dirname(fileURLToPath(url)), ...parts);
}

type PackageVersions = {
  name: string;
  version: string;
  devDependencies: Record<string, { version: string }>;
};

export function getPackageVersions(devDeps?: string[]): PackageVersions {
  const stdOut = execSync(`pnpm ls ${devDeps?.join(" ") || ""} --json`, {
    encoding: "utf-8",
  });
  return JSON.parse(stdOut)[0];
}
