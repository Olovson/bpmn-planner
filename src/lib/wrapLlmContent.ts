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
  options?: { docType?: string },
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

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body>
  <div class="doc-shell">
    ${sanitized}
  </div>
</body>
</html>`;
};

