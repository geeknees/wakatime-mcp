// ABOUTME: Ensures the compiled CLI entry has a node shebang.
// ABOUTME: Keeps the dist entry executable for npx usage.
import fs from "node:fs";
import path from "node:path";

const distEntry = path.join("dist", "index.js");
const shebang = "#!/usr/bin/env node\n";

if (fs.existsSync(distEntry)) {
  const current = fs.readFileSync(distEntry, "utf8");
  if (!current.startsWith(shebang)) {
    fs.writeFileSync(distEntry, `${shebang}${current}`, "utf8");
  }
}
