import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function resolvePath(url, ...parts) {
  return resolve(dirname(fileURLToPath(url)), ...parts);
}

export function getPackageMeta() {
  return JSON.parse(
    readFileSync(resolvePath(import.meta.url, "../package.json"), "utf8"),
  );
}

/**
 * Get package versions from version record object (like dependencies or devDependencies)
 * @param {string|string[]} packageNames - Package name or array of package names
 * @param {Object} versionRecord - Version record object (e.g., dependencies, devDependencies)
 * @returns {Object|string} - Returns version string for single package, or {packageName: version} object for array
 */
export function getVersions(packageNames, versionRecord) {
  if (!versionRecord || typeof versionRecord !== "object") {
    return null;
  }

  // Helper function to extract clean version number
  const extractVersion = (versionString) => {
    if (!versionString) return null;
    // Remove prefixes like ^, ~, >=, etc. and return clean version
    return versionString.replace(/^[\^~>=<]+/, "");
  };

  // If single string, return single version
  if (typeof packageNames === "string") {
    const version = extractVersion(versionRecord[packageNames]);
    return version || null;
  }

  // If array, return object with package names as keys
  if (Array.isArray(packageNames)) {
    const result = {};
    for (const pkg of packageNames) {
      const version = extractVersion(versionRecord[pkg]);
      if (version) {
        result[pkg] = version;
      }
    }
    return result;
  }

  return null;
}
