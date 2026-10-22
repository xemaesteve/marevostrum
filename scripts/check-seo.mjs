import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = "dist";
const site = "https://marevostrum.es";
const groups = [
  ["/", "/index-en.html", "/index-fr.html"],
  ["/perla.html", "/perla-en.html", "/perla-fr.html"],
  ["/santa-maria.html", "/santa-maria-en.html", "/santa-maria-fr.html"],
];
const legal = ["aviso-legal.html", "privacidad.html", "cookies.html"];
const languages = ["es", "en", "fr"];
const issues = [];
const all = new Set(groups.flat().map(path => site + path));
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const robots = readFileSync(join(root, "robots.txt"), "utf8");

for (const group of groups) {
  for (let i = 0; i < group.length; i++) {
    const current = group[i];
    const file = current === "/" ? "index.html" : current.slice(1);
    const source = readFileSync(join(root, file), "utf8");
    const head = source.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
    const canonicals = [...head.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)];
    if (canonicals.length !== 1 || !canonicals[0][0].includes('href="' + site + current + '"')) {
      issues.push(file + ": canonical must point to its own definitive URL");
    }
    for (let j = 0; j < group.length; j++) {
      const link = '<link rel="alternate" hreflang="' + languages[j] + '" href="' + site + group[j] + '">';
      if (!head.includes(link)) issues.push(file + ": missing " + languages[j] + " alternate");
    }
    const defaultLink = '<link rel="alternate" hreflang="x-default" href="' + site + group[0] + '">';
    if (!head.includes(defaultLink)) issues.push(file + ": missing x-default");
    if (!sitemap.includes("<loc>" + site + current + "</loc>")) {
      issues.push("sitemap: missing " + site + current);
    }
  }
}
for (const name of legal) {
  const html = readFileSync(join(root, name), "utf8");
  if (!html.includes('<link rel="canonical" href="' + site + "/" + name + '">')) {
    issues.push(name + ": missing legal canonical");
  }
}
const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1]);
if (sitemapLocs.length !== 9 || sitemapLocs.some(x => !all.has(x))) {
  issues.push("Sitemap must contain exactly the nine localized landing and apartment pages");
}
if (!robots.includes("Sitemap: " + site + "/sitemap.xml")) {
  issues.push("robots.txt must point to definitive sitemap");
}
if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log("OK: 12 canonicals, 9 localized URLs, reciprocal hreflang, sitemap and robots.txt.");
}
