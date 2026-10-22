import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

const root = resolve("dist");
const pages = readdirSync(root).filter(name => name.endsWith(".html"));
const localized = {
  "index.html": "es", "index-en.html": "en", "index-fr.html": "fr",
  "perla.html": "es", "perla-en.html": "en", "perla-fr.html": "fr",
  "santa-maria.html": "es", "santa-maria-en.html": "en", "santa-maria-fr.html": "fr"
};
const failures = [];

for (const name of pages) {
  const source = readFileSync(resolve(root, name), "utf8");
  const head = source.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  if (!/<title\b[^>]*>[^<]+<\/title>/i.test(head)) failures.push(name + ": missing title");
  if (name in localized) {
    const lang = source.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1];
    if (lang !== localized[name]) failures.push(name + ": unexpected lang " + lang);
    const descriptions = [...head.matchAll(/<meta\b[^>]*\bname=["']description["'][^>]*>/gi)];
    if (descriptions.length !== 1) failures.push(name + ": expected exactly one meta description");
  }
  if (name.startsWith("index")) {
    for (const legal of ["aviso-legal.html", "privacidad.html", "cookies.html"]) {
      if (!source.includes('href="' + legal + '"')) failures.push(name + ": missing legal link " + legal);
    }
  }

  const urls = [];
  for (const match of source.matchAll(/\b(?:href|src|poster)\s*=\s*["']([^"']+)["']/gi)) urls.push(match[1]);
  for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) urls.push(match[1]);
  for (const value of urls) {
    if (/^(?:https?:|mailto:|tel:|data:|\/\/)/i.test(value)) continue;
    const [pathPart] = value.split(/[?#]/);
    if (!pathPart || pathPart === "/") continue;
    let decoded;
    try { decoded = decodeURIComponent(pathPart); } catch {
      failures.push(name + ": invalid URL escape " + value); continue;
    }
    const target = resolve(root, decoded.replace(/^\/+/, ""));
    const rel = relative(root, target);
    if (rel.startsWith(".." + sep) || rel === "..") {
      failures.push(name + ": reference outside site " + value); continue;
    }
    if (!existsSync(target)) failures.push(name + ": missing file " + value);
  }
}

if (pages.length !== 12) failures.push("Expected 12 pages, got " + pages.length);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("OK: " + pages.length + " HTML pages, local files, metadata and legal links.");
}
