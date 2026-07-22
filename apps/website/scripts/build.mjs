import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOC_PAGES } from './docs-manifest.mjs';
import { homeBody, renderPage } from './lib/layout.mjs';
import { markdownToHtml } from './lib/markdown.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = join(__dirname, '..');
const repoRoot = join(websiteRoot, '..', '..');
const outDir = join(websiteRoot, 'dist');
const docsOutDir = join(outDir, 'docs');

mkdirSync(docsOutDir, { recursive: true });

writeFileSync(
  join(outDir, 'index.html'),
  renderPage({ title: 'Home', body: homeBody(), active: 'home' }),
);

const docLinks = DOC_PAGES.map(
  (page) => `<li><a href="./${page.slug}.html">${page.title}</a></li>`,
).join('\n');

writeFileSync(
  join(docsOutDir, 'index.html'),
  renderPage({
    title: 'Documentation',
    active: 'docs',
    depth: 1,
    body: `<p>Browse guides generated from the MyCLI repository.</p>
<ul class="doc-index">
${docLinks}
</ul>`,
  }),
);

let built = 1;

for (const page of DOC_PAGES) {
  const sourcePath = join(repoRoot, page.source);
  if (!existsSync(sourcePath)) {
    console.warn(`Skipping missing doc source: ${page.source}`);
    continue;
  }

  const markdown = readFileSync(sourcePath, 'utf8');
  const body = `<article class="markdown">${markdownToHtml(markdown)}</article>`;
  writeFileSync(
    join(docsOutDir, `${page.slug}.html`),
    renderPage({
      title: page.title,
      body,
      active: page.navId ?? page.slug,
      depth: 1,
    }),
  );
  built += 1;
}

writeFileSync(
  join(outDir, 'styles.css'),
  `:root{--bg:#0f1419;--fg:#e7ecf1;--accent:#3dd6c6;--muted:#8b9aab;--border:#243039;--card:#12181e}
*{box-sizing:border-box}
body{margin:0;font-family:"IBM Plex Sans",system-ui,sans-serif;background:radial-gradient(1200px 600px at 10% -10%,#1b2a32,var(--bg));color:var(--fg);min-height:100vh;line-height:1.6}
.hero{padding:2.5rem 1.5rem 1.5rem;border-bottom:1px solid var(--border)}
.brand{font-size:2rem;font-weight:700;letter-spacing:-.03em;margin:0}
.brand a{color:var(--accent);text-decoration:none}
h1{font-weight:500;font-size:1.1rem;color:var(--muted);margin:.5rem 0 1rem}
.site-nav{display:flex;flex-wrap:wrap;gap:.75rem 1rem}
.site-nav a{color:var(--muted);text-decoration:none;font-size:.95rem}
.site-nav a:hover,.site-nav a.active{color:var(--accent)}
main.content{padding:2rem 1.5rem;max-width:820px}
.lead p{font-size:1.1rem}
pre{background:var(--card);padding:1rem;border-radius:8px;overflow:auto;border:1px solid var(--border)}
.markdown h1,.markdown h2,.markdown h3{margin:1.5rem 0 .75rem;line-height:1.25}
.markdown h1{font-size:1.75rem;color:var(--fg)}
.markdown h2{font-size:1.35rem;color:var(--fg);border-bottom:1px solid var(--border);padding-bottom:.35rem}
.markdown h3{font-size:1.1rem;color:var(--accent)}
.markdown p,.markdown ul{margin:0 0 1rem}
.markdown ul{padding-left:1.25rem}
.markdown code{background:var(--card);padding:.1rem .35rem;border-radius:4px;font-size:.9em}
.markdown pre code{background:transparent;padding:0}
.markdown a{color:var(--accent)}
.card-list,.doc-index{list-style:none;padding:0}
.card-list li,.doc-index li{margin:0 0 .75rem;padding:.75rem 1rem;background:var(--card);border:1px solid var(--border);border-radius:8px}
footer{padding:2rem 1.5rem;color:var(--muted);border-top:1px solid var(--border)}
`,
);

console.log(`Built ${built} pages → apps/website/dist`);
