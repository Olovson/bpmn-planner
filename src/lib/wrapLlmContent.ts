const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

const stripDangerousTags = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi, '');

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const wrapLlmContentAsDocument = (
  rawContent: string,
  title: string,
  options?: { docType?: string; jsonData?: unknown },
): string => {
  const trimmed = rawContent.trim();

  if (!trimmed) {
    return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body>
  <p class="muted">Inget innehåll genererades av LLM.</p>
</body>
</html>`;
  }

  let innerHtml = trimmed;
  const hasHtmlTag = /<html[\s>]/i.test(trimmed);
  const hasBodyTag = /<body[\s>]/i.test(trimmed);

  if (hasHtmlTag || hasBodyTag) {
    const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1].trim()) {
      innerHtml = bodyMatch[1].trim();
    } else {
      innerHtml = trimmed
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\/?(html|head|body)[^>]*>/gi, '')
        .trim();
    }
  } else if (!looksLikeHtml(trimmed)) {
    const blocks = trimmed.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
    innerHtml = blocks
      .map((block) => {
        const lines = block.split('\n');
        const first = lines[0] || '';
        const headingMatch = first.match(/^#+\s+(.*)$/);
        if (headingMatch) {
          const heading = escapeHtml(headingMatch[1].trim());
          return `<h2>${heading}</h2>`;
        }
        const paragraphs = block
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join('\n');
        return paragraphs;
      })
      .join('\n');
  }

  let sanitized = stripDangerousTags(innerHtml);

  if (options?.docType === 'feature') {
    const placeholderSections: Array<{ label: string; heading: string }> = [
      { label: 'Sammanfattning', heading: 'Sammanfattning' },
      { label: 'Omfattning &amp; Avgränsningar', heading: 'Omfattning &amp; Avgränsningar' },
      { label: 'Ingående Epics', heading: 'Ingående Epics' },
      { label: 'Affärsflöde', heading: 'Affärsflöde' },
      { label: 'Kritiska beroenden', heading: 'Kritiska beroenden' },
      { label: 'Affärs-scenarion', heading: 'Affärs-scenarion' },
      { label: 'Koppling till automatiska tester', heading: 'Koppling till automatiska tester' },
      { label: 'Implementation Notes (för dev)', heading: 'Implementation Notes (för dev)' },
      { label: 'Relaterade regler / subprocesser', heading: 'Relaterade regler / subprocesser' },
    ];

    for (const section of placeholderSections) {
      if (!sanitized.includes(section.heading)) {
        sanitized += `
<section class="doc-section">
  <h2>${section.label}</h2>
  <p class="muted">Denna sektion behöver kompletteras för detta Feature Goal.</p>
</section>`;
      }
    }
  }

  // Embed JSON data if provided (for file-level docs used by E2E scenario generation)
  const jsonScript = options?.jsonData
    ? `\n  <script type="application/json">${JSON.stringify(options.jsonData, null, 2)}</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>${jsonScript}
  <style>
    :root {
      color-scheme: light;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --card-bg: #ffffff;
      --primary: #1d4ed8;
      --text-strong: #0f172a;
      --text-muted: #475569;
      --border: #e2e8f0;
      --accent: #dbeafe;
    }
    body {
      margin: 0;
      padding: 16px;
      background: #ffffff;
      color: var(--text-strong);
      line-height: 1.7;
    }
    .doc-shell {
      max-width: 960px;
      margin: 0 auto;
    }
    h1 {
      font-size: 1.5rem;
      margin: 0 0 24px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }
    h2 {
      color: var(--primary);
      margin: 24px 0 12px;
      font-size: 1.1rem;
    }
    p { margin: 0 0 12px; }
    ul { padding-left: 20px; margin: 0 0 12px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      background: var(--card-bg);
      border: 1px solid var(--border);
    }
    table th,
    table td {
      border-bottom: 1px solid var(--border);
      padding: 8px;
      text-align: left;
    }
    table th {
      background: var(--accent);
      color: var(--primary);
      font-weight: 600;
    }
    table tr:last-child td {
      border-bottom: none;
    }
    .muted { color: var(--text-muted); font-size: 0.9rem; }
    a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    a:hover { text-decoration: underline; }
    .doc-section {
      margin-bottom: 24px;
      padding: 16px;
      background: var(--card-bg);
      border: 1px solid var(--border);
    }
    .doc-section + .doc-section { margin-top: 16px; }
    .doc-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--accent);
      color: var(--primary);
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .node-section {
      margin-bottom: 24px;
      padding: 16px;
      background: var(--card-bg);
      border: 1px solid var(--border);
    }
    .node-type {
      display: inline-block;
      padding: 2px 8px;
      background: var(--accent);
      color: var(--primary);
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="doc-shell">
    ${sanitized}
  </div>
</body>
</html>`;
};

