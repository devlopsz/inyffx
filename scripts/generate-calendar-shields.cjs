const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const shieldsRoot = path.join(root, "mod", "calendar", "escudos");
const output = path.join(root, "calendar-shields.js");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".svg") ? [absolute] : [];
  });
}

const paths = walk(shieldsRoot)
  .map((absolute) => path.relative(root, absolute).split(path.sep).join("/"))
  .sort((left, right) => left.localeCompare(right, "pt-BR"));

const source = [
  "(function () {",
  "  \"use strict\";",
  "  window.INYFFX_CALENDAR_SHIELDS = " + JSON.stringify(paths, null, 2) + ";",
  "}());",
  ""
].join("\n");

fs.writeFileSync(output, source, "utf8");
console.log(`Manifesto criado com ${paths.length} escudos: ${output}`);
