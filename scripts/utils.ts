import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function getDistTag(version: string): string {
  const prerelease = version.split("+", 1)[0].match(/-(.+)$/)?.[1];
  const tag = prerelease
    ?.split(".")
    .find((identifier) => /\D/.test(identifier))
    ?.toLowerCase();

  if (prerelease && !tag) {
    throw new Error(`Cannot derive npm dist-tag from numeric prerelease "${prerelease}".`);
  }

  return tag ?? "latest";
}

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
