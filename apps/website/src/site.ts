/**
 * Minimal static documentation site for MyCLI.
 * Phase 1 ships a self-contained static generator; later phases can migrate to Next.js/Astro.
 */

export interface SitePage {
  slug: string;
  title: string;
  body: string;
}

export const SITE_NAME = 'MyCLI';
export const SITE_TAGLINE = 'Laravel Artisan for Node.js';

export const PAGES: SitePage[] = [
  {
    slug: 'index',
    title: 'Home',
    body: `
      <p>${SITE_TAGLINE}</p>
      <p>Generate production-ready applications, infrastructure, and workflows with a single CLI.</p>
      <pre><code>npm i -g @mycli-cli/cli
my create
my make module user
my add auth</code></pre>
    `,
  },
  {
    slug: 'docs',
    title: 'Documentation',
    body: `
      <ul>
        <li><a href="../ARCHITECTURE.md">Architecture</a></li>
        <li><a href="../PLUGIN_GUIDE.md">Plugin Guide</a></li>
        <li><a href="../GENERATOR_GUIDE.md">Generator Guide</a></li>
        <li><a href="../CONTRIBUTING.md">Contributing</a></li>
      </ul>
    `,
  },
];

export function renderPage(page: SitePage): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${page.title} · ${SITE_NAME}</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <header class="hero">
    <p class="brand">${SITE_NAME}</p>
    <h1>${page.title === 'Home' ? SITE_TAGLINE : page.title}</h1>
  </header>
  <main>${page.body}</main>
  <footer><small>© MyCLI</small></footer>
</body>
</html>
`;
}
