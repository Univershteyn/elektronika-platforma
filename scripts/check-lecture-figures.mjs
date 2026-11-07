import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const htmlPath = path.join(root, "maruza/index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const fail = [];
for (const needle of ["figref", "figBox", "figBack", "openFig", "MARUZA_FIGS", 'src="figures.js"']) {
  if (html.includes(needle)) fail.push("index still has " + needle);
}
if (fs.existsSync(path.join(root, "maruza/figures.js"))) fail.push("figures.js still present");
if (fs.existsSync(path.join(root, "maruza/rasm"))) fail.push("maruza/rasm still present");

const start = html.indexOf("const LEC=");
const end = html.indexOf("const EMBLEM=");
if (start < 0 || end < start) fail.push("lecture object missing");
else {
  const LEC = new Function(html.slice(start, end) + "; return LEC;")();
  const fig = /\d+(?:\.\d+)?(?:-[a-zA-Z])?\s*[-–]?\s*rasm/i;
  for (const [id, lec] of Object.entries(LEC)) {
    const text = String(lec.h || "").replace(/<[^>]+>/g, " ");
    if (fig.test(text) || text.includes("figref")) fail.push("lecture " + id + " still has a figure term");
  }
}
if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("lecture figures removed");
