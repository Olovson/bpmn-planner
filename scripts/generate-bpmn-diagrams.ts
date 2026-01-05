#!/usr/bin/env tsx

/**
 * Script för att generera statiska bilder av BPMN-diagram och embedda dem i feature goal HTML-filer.
 * 
 * Detta script:
 * 1. Läser alla feature goal HTML-filer
 * 2. För varje fil, hittar motsvarande BPMN-fil
 * 3. Använder Playwright för att rendera bpmn-js i headless browser
 * 4. Tar screenshot och konverterar till base64
 * 5. Embeddar bilden i HTML-filen
 * 6. Lägger till "Process Diagram" kapitel i slutet
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FEATURE_GOALS_DIR = path.join(__dirname, '../public/local-content/feature-goals');
const BPMN_FIXTURES_DIR = path.join(__dirname, '../tests/fixtures/bpmn/mortgage-se 2026.01.04 16:30');
const TEMP_HTML_DIR = path.join(__dirname, '../temp/bpmn-renderer');

// Skapa temp-mapp om den inte finns
if (!fs.existsSync(TEMP_HTML_DIR)) {
  fs.mkdirSync(TEMP_HTML_DIR, { recursive: true });
}

/**
 * Extraherar BPMN-filnamn från HTML-filnamn eller HTML-innehåll
 */
function extractBpmnFileName(htmlFileName: string, htmlContent: string): string | null {
  // Försök hitta BPMN-filnamn från HTML-innehåll (i "BPMN - Process" sektionen)
  const bpmnLinkMatch = htmlContent.match(/href="#\/bpmn\/([^"]+\.bpmn)"/);
  if (bpmnLinkMatch) {
    return bpmnLinkMatch[1];
  }

  // Fallback: extrahera från filnamn
  // Exempel: mortgage-se-signing-v2.html → mortgage-se-signing.bpmn
  const baseName = htmlFileName
    .replace(/-v2\.html$/, '')
    .replace(/\.html$/, '');
  
  // Kontrollera om BPMN-filen finns
  const bpmnFileName = `${baseName}.bpmn`;
  const bpmnFilePath = path.join(BPMN_FIXTURES_DIR, bpmnFileName);
  
  if (fs.existsSync(bpmnFilePath)) {
    return bpmnFileName;
  }

  return null;
}

/**
 * Skapar en HTML-sida som renderar BPMN-diagram med bpmn-js
 */
function createBpmnRendererHtml(bpmnXml: string): string {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BPMN Renderer</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 20px;
      background: white;
      overflow: hidden;
    }
    #canvas {
      width: 100%;
      height: 100vh;
      min-height: 800px;
      max-height: 1200px;
      border: 1px solid #e2e8f0;
    }
  </style>
  <link rel="stylesheet" href="https://unpkg.com/bpmn-js@18.8.0/dist/assets/diagram-js.css" />
  <link rel="stylesheet" href="https://unpkg.com/bpmn-js@18.8.0/dist/assets/bpmn-js.css" />
  <link rel="stylesheet" href="https://unpkg.com/bpmn-js@18.8.0/dist/assets/bpmn-font/css/bpmn-embedded.css" />
</head>
<body>
  <div id="canvas"></div>
  <script src="https://cdn.jsdelivr.net/npm/bpmn-js@18.8.0/dist/bpmn-viewer.production.min.js"></script>
  <script>
    const bpmnXML = ${JSON.stringify(bpmnXml)};
    
    // bpmn-viewer.production.min.js exporterar BpmnJS globalt
    const viewer = new BpmnJS({
      container: '#canvas'
    });
    
    // Spara viewer globalt för senare användning
    window.viewer = viewer;
    
    viewer.importXML(bpmnXML)
      .then(() => {
        const canvas = viewer.get('canvas');
        const elementRegistry = viewer.get('elementRegistry');
        
        // Hitta diagrammets faktiska bounding box
        const allElements = elementRegistry.getAll();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        allElements.forEach(element => {
          if (element.x !== undefined && element.y !== undefined) {
            const x = element.x;
            const y = element.y;
            const width = element.width || 0;
            const height = element.height || 0;
            
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
          }
        });
        
        if (minX !== Infinity) {
          // Beräkna diagrammets centrum och storlek
          const diagramWidth = maxX - minX;
          const diagramHeight = maxY - minY;
          const diagramCenterX = minX + diagramWidth / 2;
          const diagramCenterY = minY + diagramHeight / 2;
          
          // Spara för användning
          window.diagramBounds = {
            x: minX,
            y: minY,
            width: diagramWidth,
            height: diagramHeight,
            centerX: diagramCenterX,
            centerY: diagramCenterY
          };
          
          // Använd fit-viewport - detta säkerställer att hela diagrammet syns och centreras korrekt
          canvas.zoom('fit-viewport', 'auto');
        } else {
          // Fallback: zoom to fit
          canvas.zoom('fit-viewport', 'auto');
        }
        
        // Vänta lite för att säkerställa att renderingen är klar
        setTimeout(() => {
          // Signalera att renderingen är klar
          window.renderComplete = true;
        }, 2000);
      })
      .catch(err => {
        console.error('Error rendering BPMN:', err);
        window.renderError = err.message || 'Unknown error';
        window.renderComplete = true; // Signalera även vid fel så att vi kan fortsätta
      });
  </script>
</body>
</html>`;
}

/**
 * Renderar BPMN-diagram och returnerar PNG som Buffer
 */
async function renderBpmnToImage(bpmnXml: string): Promise<Buffer> {
  // Skapa temporär HTML-fil
  const tempHtmlPath = path.join(TEMP_HTML_DIR, `render-${Date.now()}.html`);
  const htmlContent = createBpmnRendererHtml(bpmnXml);
  fs.writeFileSync(tempHtmlPath, htmlContent);

  // Starta Playwright browser med optimal viewport-storlek
  // Mindre viewport = högre zoom från fit-viewport = större diagram i bilden
  // Använd deviceScaleFactor för högre upplösning
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 }, // Mindre viewport = högre zoom
    deviceScaleFactor: 3, // 3x för mycket hög upplösning (4800x3600 effektivt)
  });
  const page = await context.newPage();

  try {
    // Ladda HTML-filen
    await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'domcontentloaded' });

    // Vänta på att bpmn-js är laddat
    await page.waitForFunction(() => typeof BpmnJS !== 'undefined', { timeout: 15000 });

    // Vänta på att renderingen är klar
    await page.waitForFunction(() => window.renderComplete === true, { timeout: 30000 });

    // Vänta lite extra för att säkerställa att allt är renderat
    await page.waitForTimeout(500);

    // Kontrollera om det finns ett fel
    const hasError = await page.evaluate(() => window.renderError);
    if (hasError) {
      throw new Error(`Rendering error: ${hasError}`);
    }

    // Ta screenshot av canvas med högre zoom och centrering
    // Vänta lite extra för att säkerställa att zoom är klar
    await page.waitForTimeout(1500);

    // Hämta canvas-elementet
    const canvas = await page.$('#canvas');
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    // Hämta canvas bounding box
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) {
      throw new Error('Could not get canvas bounding box');
    }

    // Ta screenshot av hela canvas med hög upplösning
    const screenshot = await page.screenshot({
      type: 'png',
      clip: {
        x: canvasBox.x,
        y: canvasBox.y,
        width: canvasBox.width,
        height: canvasBox.height,
      },
    });

    // Returnera screenshot som Buffer (inte base64)
    return screenshot;
  } catch (error) {
    console.error('Error rendering BPMN:', error);
    throw error;
  } finally {
    await browser.close();
    // Ta bort temporär HTML-fil
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
  }
}

/**
 * Lägger till "Process Diagram" kapitel i HTML-filen
 */
function addProcessDiagramSection(htmlContent: string, base64Image: string): string {
  // Hitta slutet av body-taggen
  const bodyEndIndex = htmlContent.lastIndexOf('</body>');
  if (bodyEndIndex === -1) {
    // Om ingen </body> finns, lägg till i slutet
    return htmlContent + createProcessDiagramSection(base64Image);
  }

  // Lägg till kapitlet före </body>
  const beforeBodyEnd = htmlContent.substring(0, bodyEndIndex);
  const afterBodyEnd = htmlContent.substring(bodyEndIndex);

  return beforeBodyEnd + createProcessDiagramSection(base64Image) + afterBodyEnd;
}

/**
 * Skapar HTML för "Process Diagram" kapitel
 */
function createProcessDiagramSection(base64Image: string): string {
  return `
    <section class="doc-section">
      <details>
        <summary>Process Diagram</summary>
        <div class="section-content">
          <p>Nedan visas BPMN-processdiagrammet för denna subprocess:</p>
          <div style="margin: 20px 0; text-align: center;">
            <img 
              src="data:image/png;base64,${base64Image}" 
              alt="BPMN Process Diagram" 
              style="max-width: 100%; height: auto; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
            />
          </div>
          <p class="muted">Diagrammet visar processflödet med alla aktiviteter, gateways, events och sequence flows.</p>
        </div>
      </details>
    </section>
  `;
}

/**
 * Huvudfunktion
 */
async function main() {
  console.log('🚀 Startar generering av BPMN-diagram bilder...\n');

  // Hämta alla HTML-filer
  const htmlFiles = fs.readdirSync(FEATURE_GOALS_DIR)
    .filter(file => file.endsWith('.html'))
    .map(file => path.join(FEATURE_GOALS_DIR, file));

  console.log(`📁 Hittade ${htmlFiles.length} HTML-filer\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const htmlFilePath of htmlFiles) {
    const htmlFileName = path.basename(htmlFilePath);
    console.log(`📄 Bearbetar: ${htmlFileName}`);

    try {
      // Läs HTML-innehåll
      let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

      // Kontrollera om diagram redan finns (men generera om för högre upplösning)
      const hasExistingDiagram = htmlContent.includes('Process Diagram');
      if (hasExistingDiagram) {
        console.log(`  🔄 Diagram finns redan, uppdaterar med högre upplösning...`);
        // Ta bort befintligt diagram för att ersätta det
        const diagramSectionRegex = /<section class="doc-section">\s*<details>\s*<summary>Process Diagram<\/summary>[\s\S]*?<\/details>\s*<\/section>/i;
        htmlContent = htmlContent.replace(diagramSectionRegex, '');
      }

      // Extrahera BPMN-filnamn
      const bpmnFileName = extractBpmnFileName(htmlFileName, htmlContent);
      if (!bpmnFileName) {
        console.log(`  ⚠️  Kunde inte hitta BPMN-fil, hoppar över\n`);
        skipped++;
        continue;
      }

      console.log(`  📋 BPMN-fil: ${bpmnFileName}`);

      // Läs BPMN-fil
      const bpmnFilePath = path.join(BPMN_FIXTURES_DIR, bpmnFileName);
      if (!fs.existsSync(bpmnFilePath)) {
        console.log(`  ⚠️  BPMN-fil finns inte: ${bpmnFilePath}\n`);
        skipped++;
        continue;
      }

      const bpmnXml = fs.readFileSync(bpmnFilePath, 'utf-8');

      // Rendera BPMN till bild
      console.log(`  🎨 Renderar diagram...`);
      const screenshotBuffer = await renderBpmnToImage(bpmnXml);

      // Konvertera till base64 för embedding
      const base64Image = screenshotBuffer.toString('base64');

      // Lägg till diagram-sektion i HTML med embedded bild
      const updatedHtml = addProcessDiagramSection(htmlContent, base64Image);

      // Spara uppdaterad HTML
      fs.writeFileSync(htmlFilePath, updatedHtml, 'utf-8');

      console.log(`  ✅ Klar!\n`);
      processed++;

    } catch (error) {
      console.error(`  ❌ Fel: ${error instanceof Error ? error.message : String(error)}\n`);
      errors++;
    }
  }

  // Rensa temp-mapp
  if (fs.existsSync(TEMP_HTML_DIR)) {
    const tempFiles = fs.readdirSync(TEMP_HTML_DIR);
    for (const file of tempFiles) {
      fs.unlinkSync(path.join(TEMP_HTML_DIR, file));
    }
  }

  console.log('📊 Sammanfattning:');
  console.log(`  ✅ Bearbetade: ${processed}`);
  console.log(`  ⏭️  Hoppade över: ${skipped}`);
  console.log(`  ❌ Fel: ${errors}`);
  console.log(`\n🎉 Klar!`);
}

// Kör scriptet
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
