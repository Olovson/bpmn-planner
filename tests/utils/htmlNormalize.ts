export const extractBodyHtml = (html: string): string => {
  if (!html) return '';
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1];
  }
  return html;
};

export const normalizeHtml = (html: string): string => {
  if (!html) return '';
  // Enkel normalisering för regressionsjämförelser:
  // - extrahera body-innehåll om det finns
  // - trimma början/slut
  // - komprimera whitespace-sekvenser till ett mellanslag
  const body = extractBodyHtml(html);
  return body.replace(/\s+/g, ' ').trim();
};
