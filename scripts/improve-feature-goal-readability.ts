import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FEATURE_GOALS_DIR = path.join(__dirname, '../public/local-content/feature-goals');

// CSS för förbättrad läsbarhet (utan sidebar)
const IMPROVED_CSS = `
    :root {
      --primary: #1d4ed8;
      --text-strong: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --accent: #e0e7ff;
      --bg-light: #f8f9fa;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 24px;
      background: #ffffff;
      color: var(--text-strong);
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 2rem;
      margin: 0 0 32px;
      border-bottom: 2px solid var(--border);
      padding-bottom: 12px;
      color: var(--text-strong);
    }
    h2 {
      color: var(--primary);
      margin: 0;
      font-size: 1.5rem;
    }
    h3 {
      color: var(--text-strong);
      margin: 32px 0 12px;
      font-size: 1.2rem;
    }
    p { margin: 0 0 12px; }
    ul {
      padding-left: 24px;
      margin: 0 0 16px;
    }
    li { margin-bottom: 8px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      background: white;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }
    table th,
    table td {
      border-bottom: 1px solid var(--border);
      padding: 12px;
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
    .muted {
      color: var(--text-muted);
      font-size: 0.9rem;
      font-style: italic;
    }
    .card {
      background: var(--bg-light);
      padding: 20px;
      border-radius: 8px;
      margin: 16px 0;
      border-left: 4px solid var(--primary);
    }
    .doc-section {
      margin-bottom: 16px;
      background: white;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .doc-section details {
      margin: 0;
    }
    .doc-section details summary {
      cursor: pointer;
      font-weight: 600;
      color: var(--primary);
      padding: 16px 20px;
      background: var(--bg-light);
      border-bottom: 1px solid var(--border);
      user-select: none;
      font-size: 1.5rem;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .doc-section details summary::-webkit-details-marker {
      display: none;
    }
    .doc-section details summary::before {
      content: '▶';
      display: inline-block;
      transition: transform 0.2s;
      font-size: 0.8rem;
      color: var(--primary);
    }
    .doc-section details[open] summary::before {
      transform: rotate(90deg);
    }
    .doc-section details summary:hover {
      background: var(--accent);
    }
    .doc-section details .section-content {
      padding: 20px;
    }
    .doc-section details[open] summary {
      border-bottom: 1px solid var(--border);
    }
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
    .local-version-badge {
      background: #e0f2fe;
      color: #0369a1;
      padding: 8px 16px;
      margin: 16px 0;
      border-radius: 6px;
      border-left: 4px solid #0284c7;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .llm-fallback-banner {
      padding: 8px 12px;
      margin-bottom: 16px;
      border-radius: 6px;
      background-color: #fefce8;
      color: #854d0e;
      border: 1px solid #fef9c3;
      font-size: 0.85rem;
    }
    .llm-fallback-badge {
      display: inline-block;
      padding: 4px 8px;
      margin-bottom: 12px;
      border-radius: 4px;
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeeba;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .llm-fallback-details {
      font-size: 0.8rem;
      color: #4b5563;
      margin-bottom: 16px;
      white-space: pre-wrap;
    }
    .llm-fallback-local-note {
      font-size: 0.8rem;
      color: #2563eb;
      margin-bottom: 16px;
    }
    details {
      margin: 16px 0;
    }
    details summary {
      cursor: pointer;
      font-weight: 600;
      color: var(--primary);
      padding: 12px;
      background: var(--bg-light);
      border: 1px solid var(--border);
      border-radius: 6px;
      user-select: none;
    }
    details summary:hover {
      background: var(--accent);
    }
    details[open] summary {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
    details .collapsible-content {
      padding: 16px;
      border: 1px solid var(--border);
      border-top: none;
      border-radius: 0 0 6px 6px;
      margin-top: 0;
    }
    img {
      max-width: 100%;
      height: auto;
      border: 1px solid var(--border);
      border-radius: 4px;
      margin: 12px 0;
    }
    a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    a:hover { text-decoration: underline; }
`;

function makeSectionCollapsible(html: string, sectionTitle: string, isOpen: boolean = false): string {
  // Försök hitta section med h2 inuti
  // Först: section med h2 direkt efter
  const sectionWithH2Regex = new RegExp(
    `(<section[^>]*class="doc-section"[^>]*>\\s*)(<h2[^>]*>${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h2>\\s*)([\\s\\S]*?)(</section>)`,
    'gi'
  );
  
  let updated = html;
  let found = false;
  
  // Försök matcha section med h2
  updated = html.replace(sectionWithH2Regex, (match, startTag, h2Tag, content, endTag) => {
    found = true;
    // Om det redan är en details-tag, uppdatera den
    if (content.includes('<details')) {
      // Om den redan är collapsible, uppdatera open-attributet
      if (isOpen && !content.includes('details open')) {
        return match.replace('<details>', '<details open>').replace('<details ', '<details open ');
      } else if (!isOpen && content.includes('details open')) {
        return match.replace('details open', 'details');
      }
      return match;
    }
    
    // Skapa collapsible structure
    const openAttr = isOpen ? ' open' : '';
    return `<section class="doc-section">
      <details${openAttr}>
        <summary>${sectionTitle}</summary>
        <div class="section-content">
${content.trim()}
        </div>
      </details>
    </section>`;
  });
  
  // Om inget matchades, försök hitta h2 direkt (utan section wrapper)
  if (!found) {
    const h2DirectRegex = new RegExp(
      `(<h2[^>]*>${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h2>\\s*)([\\s\\S]*?)(?=<h2|<section|</body>)`,
      'gi'
    );
    
    updated = updated.replace(h2DirectRegex, (match, h2Tag, content) => {
      found = true;
      // Om det redan är en details-tag, hoppa över
      if (content.includes('<details')) {
        return match;
      }
      
      // Hitta närmaste section eller skapa en
      const openAttr = isOpen ? ' open' : '';
      return `<section class="doc-section">
      <details${openAttr}>
        <summary>${sectionTitle}</summary>
        <div class="section-content">
${content.trim()}
        </div>
      </details>
    </section>`;
    });
  }
  
  return updated;
}

function removeConfluenceSection(html: string): string {
  // Ta bort hela Confluence-sektionen (med eller utan details)
  const confluenceRegex1 = /<section[^>]*class="doc-section"[^>]*>[\s\S]*?<details[^>]*>[\s\S]*?<summary>Confluence.*?<\/summary>[\s\S]*?<\/details>[\s\S]*?<\/section>/gi;
  const confluenceRegex2 = /<section[^>]*class="doc-section"[^>]*>[\s\S]*?<h2[^>]*>Confluence.*?<\/h2>[\s\S]*?<\/section>/gi;
  
  let updated = html.replace(confluenceRegex1, '');
  updated = updated.replace(confluenceRegex2, '');
  
  return updated;
}

function ensureBeskrivningSection(html: string, title: string): string {
  // Kolla om "Beskrivning av FGoal" redan finns
  if (html.includes('Beskrivning av FGoal') || html.includes('Beskrivning')) {
    return html;
  }
  
  // Extrahera titel från HTML
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const featureGoalTitle = titleMatch ? titleMatch[1] : title;
  
  // Hitta var första sektionen börjar (efter badge)
  const badgeMatch = html.match(/(<div class="local-version-badge"[^>]*>[\s\S]*?<\/div>)/i);
  const firstSectionMatch = html.match(/(<section class="doc-section">)/i);
  
  if (badgeMatch && firstSectionMatch) {
    // Lägg till "Beskrivning av FGoal" direkt efter badge, före första sektionen
    const beskrivningSection = `
    <section class="doc-section">
      <details open>
        <summary>Beskrivning av FGoal</summary>
        <div class="section-content">
<p>${featureGoalTitle} är en process som [TODO: Lägg till beskrivning baserat på BPMN-filen].</p>
        </div>
      </details>
    </section>
`;
    
    // Infoga efter badge, före första sektionen
    const insertPos = firstSectionMatch.index || badgeMatch.index! + badgeMatch[0].length;
    html = html.slice(0, insertPos) + beskrivningSection + html.slice(insertPos);
  }
  
  return html;
}

function updateHTMLFile(filePath: string): boolean {
  try {
    let html = fs.readFileSync(filePath, 'utf-8');
    
    // Extrahera titel för att använda i beskrivning om den saknas
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'Feature Goal';
    
    // Ta bort Confluence-sektionen
    html = removeConfluenceSection(html);
    
    // Ersätt CSS
    const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/i;
    html = html.replace(styleRegex, `<style>${IMPROVED_CSS}</style>`);
    
    // Ta bort sidebar/TOC och container-struktur
    html = html.replace(/<div class="doc-container">[\s\S]*?<aside class="doc-sidebar">[\s\S]*?<\/aside>/gi, '');
    html = html.replace(/<main class="doc-main">/gi, '');
    html = html.replace(/<\/main>/gi, '');
    html = html.replace(/<div class="doc-shell">/gi, '');
    // Ta bort extra </div> taggar före </body> eller <script>
    html = html.replace(/<\/div>\s*<\/div>\s*<\/body>/gi, '</body>');
    html = html.replace(/<\/div>\s*<\/body>/gi, '</body>');
    html = html.replace(/<\/div>\s*<\/div>\s*<script>/gi, '<script>');
    html = html.replace(/<\/div>\s*<script>/gi, '<script>');
    
    // Ta bort TOC JavaScript
    html = html.replace(/<script>[\s\S]*?updateActiveTOC[\s\S]*?<\/script>/gi, '');
    
    // Se till att "Beskrivning av FGoal" finns
    html = ensureBeskrivningSection(html, title);
    
    // Lista över sektioner som ska vara collapsible
    // Alla förutom "Beskrivning av FGoal" ska vara stängda
    const allSections = [
      { title: 'Beskrivning av FGoal', open: true },
      { title: 'Processteg - Input', open: false },
      { title: 'Processteg - Output', open: false },
      { title: 'Omfattning', open: false },
      { title: 'Avgränsning', open: false },
      { title: 'Beroenden', open: false },
      { title: 'BPMN - Process', open: false },
      { title: 'BPMN-processteg', open: false },
      { title: 'Testgenerering', open: false },
      { title: 'Effekt', open: false },
      { title: 'User stories', open: false },
      { title: 'Acceptanskriterier', open: false },
    ];
    
    // Gör alla sektioner collapsible
    // Börja med de som ska vara stängda (för att undvika att matcha fel)
    allSections
      .filter(s => !s.open)
      .forEach(section => {
        html = makeSectionCollapsible(html, section.title, false);
      });
    
    // Gör "Beskrivning av FGoal" collapsible men öppen
    html = makeSectionCollapsible(html, 'Beskrivning av FGoal', true);
    
    // Spara uppdaterad fil
    fs.writeFileSync(filePath, html, 'utf-8');
    return true;
  } catch (error) {
    console.error(`  ❌ Fel vid uppdatering av ${path.basename(filePath)}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Uppdaterar Feature Goal-dokument med collapsible sections...\n');
  
  const files = fs.readdirSync(FEATURE_GOALS_DIR)
    .filter(file => file.endsWith('.html'))
    .map(file => path.join(FEATURE_GOALS_DIR, file));
  
  console.log(`Hittade ${files.length} filer att uppdatera\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of files) {
    const fileName = path.basename(file);
    console.log(`Uppdaterar ${fileName}...`);
    
    if (updateHTMLFile(file)) {
      console.log(`  ✅ ${fileName} uppdaterad`);
      successCount++;
    } else {
      console.log(`  ⚠️  ${fileName} kunde inte uppdateras`);
      failCount++;
    }
  }
  
  console.log(`\n✅ Klart! ${successCount} filer uppdaterade, ${failCount} filer misslyckades`);
}

main().catch(console.error);
