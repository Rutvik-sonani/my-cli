const SITE_NAME = 'MyCLI';
const SITE_TAGLINE = 'Laravel Artisan for Node.js';

export function siteNav(active = '') {
  const links = [
    { href: '../index.html', label: 'Home', id: 'home' },
    { href: './index.html', label: 'Docs', id: 'docs' },
    { href: './getting-started.html', label: 'Getting started', id: 'getting-started' },
    { href: './plugin-guide.html', label: 'Plugins', id: 'plugin-guide' },
    { href: './publishing.html', label: 'Publishing', id: 'publishing' },
  ];

  const items = links
    .map((link) => {
      const cls = active === link.id ? ' class="active"' : '';
      return `<a href="${link.href}"${cls}>${link.label}</a>`;
    })
    .join('\n');

  return `<nav class="site-nav">${items}</nav>`;
}

export function renderPage({ title, body, active = '', depth = 0 }) {
  const prefix = depth > 0 ? '../'.repeat(depth) : './';
  const nav = depth > 0 ? siteNav(active).replaceAll('../', prefix) : siteNav(active);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${SITE_TAGLINE}" />
  <title>${title} · ${SITE_NAME}</title>
  <link rel="stylesheet" href="${prefix}styles.css" />
</head>
<body>
  <header class="hero">
    <p class="brand"><a href="${prefix}index.html">${SITE_NAME}</a></p>
    <h1>${title === 'Home' ? SITE_TAGLINE : title}</h1>
    ${nav}
  </header>
  <main class="content">${body}</main>
  <footer><small>© MyCLI — documentation built from repository guides</small></footer>
</body>
</html>
`;
}

export function homeBody() {
  return `<section class="lead">
<p>${SITE_TAGLINE}</p>
<p>Generate production-ready applications, infrastructure, and workflows with a single CLI.</p>
</section>
<pre><code>npm i -g @mycli/cli
my create my-app --yes
my make module user
my add auth</code></pre>
<section>
<h2>Documentation</h2>
<ul class="card-list">
<li><a href="./docs/getting-started.html">Getting started</a> — install, create, daily commands</li>
<li><a href="./docs/architecture.html">Architecture</a> — monorepo and package layout</li>
<li><a href="./docs/plugin-guide.html">Plugin guide</a> — authoring and marketplace</li>
<li><a href="./docs/generator-guide.html">Generators</a> — <code>my make</code> reference</li>
<li><a href="./docs/publishing.html">Publishing</a> — npm release workflow</li>
</ul>
</section>`;
}

export { SITE_NAME, SITE_TAGLINE };
