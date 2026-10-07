// Generates THIRD_PARTY_LICENSES.md from the packages vendored into dist at build time.
import fs from "node:fs";
import path from "node:path";

const VENDORED = ["uqr", "fast-png", "fflate", "iobuffer", "jpeg-js", "jsqr"];
const LICENSE_FILES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "LICENCE"];

function findPackageDir(name) {
  const candidates = [];
  const store = path.join(process.cwd(), "node_modules", ".pnpm");
  if (fs.existsSync(store)) {
    for (const entry of fs.readdirSync(store)) {
      if (entry === name || entry.startsWith(name + "@")) {
        candidates.push(path.join(store, entry, "node_modules", name));
      }
    }
  }
  candidates.push(path.join(process.cwd(), "node_modules", name));
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
  }
  throw new Error("Cannot locate installed package: " + name);
}

let out = "# Third-Party Licenses\n\n";
out += "This package bundles the following libraries (vendored into `dist/` at build time).\n\n";
for (const name of VENDORED) {
  const dir = findPackageDir(name);
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  out += "## " + pkg.name + "@" + pkg.version + "\n\nLicense: " + (pkg.license ?? "see below") + "\n\n";
  const licenseFile = LICENSE_FILES.map((f) => path.join(dir, f)).find((p) => fs.existsSync(p));
  if (licenseFile) {
    out += "```\n" + fs.readFileSync(licenseFile, "utf8").trim() + "\n```\n\n";
  } else {
    out += "_No license file found in the package; repository: " + (pkg.repository?.url ?? "unknown") + "_\n\n";
  }
  console.log("OK " + pkg.name + "@" + pkg.version + " (" + pkg.license + ")");
}
fs.writeFileSync("THIRD_PARTY_LICENSES.md", out);
console.log("wrote THIRD_PARTY_LICENSES.md");
