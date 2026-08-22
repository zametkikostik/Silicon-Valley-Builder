export interface SeoAuditResult {
  score: number;
  aiVisibilityScore: number;
  issues: { id: string; severity: "error" | "warn" | "info"; message: string; fix?: string }[];
  recommendations: string[];
}

export function auditProject(files: Record<string, string>): SeoAuditResult {
  const issues: SeoAuditResult["issues"] = [];
  let score = 100;
  let aiScore = 80;

  const hasIndex = Object.keys(files).some((f) => f.includes("index.html") || f.includes("App.tsx") || f.includes("page.tsx"));
  if (!hasIndex) {
    issues.push({ id: "no-entry", severity: "error", message: "No entry point found", fix: "Add index.html or App.tsx" });
    score -= 30;
  }

  const html = Object.entries(files).find(([k]) => k.endsWith(".html") || k.includes("index"))?.[1] || "";
  const tsx = Object.values(files).join("\n");

  if (!tsx.includes("<title") && !html.includes("<title")) {
    issues.push({ id: "no-title", severity: "error", message: "Missing <title> tag", fix: "Add <title>Your App</title>" });
    score -= 15;
    aiScore -= 10;
  }
  if (!tsx.includes("meta name=\"description\"") && !html.includes("description")) {
    issues.push({ id: "no-desc", severity: "warn", message: "Missing meta description", fix: "Add <meta name=\"description\" content=\"...\">" });
    score -= 10;
    aiScore -= 5;
  }
  if (!tsx.includes("og:title") && !html.includes("og:title")) {
    issues.push({ id: "no-og", severity: "warn", message: "Missing Open Graph tags", fix: "Add og:title, og:description, og:image" });
    score -= 8;
    aiScore -= 10;
  }
  if (!Object.keys(files).some((f) => f.includes("sitemap"))) {
    issues.push({ id: "no-sitemap", severity: "info", message: "No sitemap.xml", fix: "Generate sitemap.xml" });
    score -= 5;
  }
  if (!Object.keys(files).some((f) => f.includes("robots"))) {
    issues.push({ id: "no-robots", severity: "info", message: "No robots.txt", fix: "Add robots.txt allowing crawlers" });
    score -= 5;
  }
  if (!tsx.includes("application/ld+json") && !html.includes("ld+json")) {
    issues.push({ id: "no-jsonld", severity: "info", message: "No JSON-LD structured data", fix: "Add Schema.org JSON-LD" });
    aiScore -= 15;
  }
  if (!tsx.includes("<h1") && !html.includes("<h1")) {
    issues.push({ id: "no-h1", severity: "warn", message: "No H1 heading", fix: "Add a clear H1" });
    score -= 8;
    aiScore -= 10;
  }

  return {
    score: Math.max(0, score),
    aiVisibilityScore: Math.max(0, aiScore),
    issues,
    recommendations: [
      "Use semantic HTML (header, main, article, nav)",
      "Add alt text to all images",
      "Ensure SSR or pre-rendering for crawlers",
      "Submit sitemap to Google Search Console",
      "Use clear headings and content for AI engines",
    ],
  };
}
