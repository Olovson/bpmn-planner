import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Testar generering av BPMN-diagram för en specifik fil
 */
async function testSingleDiagram() {
  const testFile = 'mortgage-appeal-v2.html';
  const featureGoalsDir = path.join(process.cwd(), 'public/local-content/feature-goals');
  const htmlFilePath = path.join(featureGoalsDir, testFile);
  
  if (!fs.existsSync(htmlFilePath)) {
    console.error(`❌ Filen ${testFile} finns inte`);
    return;
  }

  // Läs HTML-innehåll
  let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
  
  // Extrahera BPMN-filnamn (samma logik som huvudscriptet)
  const bpmnLinkMatch = htmlContent.match(/href="#\/bpmn\/([^"]+\.bpmn)"/);
  let bpmnFileName: string | null = null;
  
  if (bpmnLinkMatch) {
    bpmnFileName = bpmnLinkMatch[1];
  } else {
    // Fallback: extrahera från filnamn
    const baseName = testFile
      .replace(/-v2\.html$/, '')
      .replace(/\.html$/, '')
      .replace(/^mortgage-/, 'mortgage-se-');
    bpmnFileName = `${baseName}.bpmn`;
  }
  
  if (!bpmnFileName) {
    console.error('❌ Kunde inte hitta BPMN-filnamn');
    return;
  }
  
  console.log(`📋 BPMN-fil: ${bpmnFileName}`);
  
  // Hitta BPMN-fil (samma sökväg som huvudscriptet)
  const bpmnFixturesDir = path.join(process.cwd(), 'tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11');
  const bpmnFilePath = path.join(bpmnFixturesDir, bpmnFileName);
  
  if (!fs.existsSync(bpmnFilePath)) {
    console.error(`❌ BPMN-filen ${bpmnFileName} finns inte`);
    return;
  }
  
  const bpmnXml = fs.readFileSync(bpmnFilePath, 'utf-8');
  console.log(`✅ Laddade BPMN-fil (${bpmnXml.length} bytes)`);
  
  // Skapa temporär HTML för rendering
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempHtmlPath = path.join(tempDir, 'test-render.html');
  const htmlContent2 = createBpmnRendererHtml(bpmnXml);
  fs.writeFileSync(tempHtmlPath, htmlContent2);
  console.log(`✅ Skapade temporär HTML: ${tempHtmlPath}`);
  
  // Starta browser
  const browser = await chromium.launch({ headless: false }); // headless: false för att se vad som händer
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1200 }, // Mindre viewport = högre zoom
  });
  
  try {
    console.log('🌐 Laddar HTML...');
    await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'domcontentloaded' });
    
    console.log('⏳ Väntar på bpmn-js...');
    await page.waitForFunction(() => typeof (window as any).BpmnJS !== 'undefined', { timeout: 15000 });
    
    console.log('⏳ Väntar på rendering...');
    await page.waitForFunction(() => (window as any).renderComplete === true, { timeout: 30000 });
    
    await page.waitForTimeout(3000); // Vänta längre för att zoom ska slutföras
    
    // Ta screenshot och spara för inspektion
    const screenshotPath = path.join(tempDir, 'test-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot sparad: ${screenshotPath}`);
    
    // Hämta canvas bounding box
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('#canvas');
      if (!canvas) return null;
      
      const rect = canvas.getBoundingClientRect();
      const viewer = (window as any).viewer;
      const bounds = (window as any).diagramBounds;
      
      return {
        canvasRect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        diagramBounds: bounds,
        viewbox: viewer ? viewer.get('canvas').viewbox() : null
      };
    });
    
    console.log('\n📊 Canvas info:');
    console.log(JSON.stringify(canvasInfo, null, 2));
    
    // Vänta så användaren kan se
    console.log('\n⏸️  Browser öppen - kontrollera resultatet manuellt');
    console.log('Tryck Enter för att stänga...');
    
    // Vänta på Enter (i headless mode skulle vi bara stänga direkt)
    await new Promise(resolve => setTimeout(resolve, 10000)); // Vänta 10 sekunder
    
  } catch (error) {
    console.error('❌ Fel:', error);
  } finally {
    await browser.close();
  }
}

function createBpmnRendererHtml(bpmnXml: string): string {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BPMN Renderer Test</title>
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
    
    const viewer = new BpmnJS({
      container: '#canvas'
    });
    
    window.viewer = viewer;
    
    viewer.importXML(bpmnXML)
      .then(() => {
        const canvas = viewer.get('canvas');
        const elementRegistry = viewer.get('elementRegistry');
        
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
          const diagramWidth = maxX - minX;
          const diagramHeight = maxY - minY;
          const diagramCenterX = minX + diagramWidth / 2;
          const diagramCenterY = minY + diagramHeight / 2;
          
          window.diagramBounds = {
            x: minX,
            y: minY,
            width: diagramWidth,
            height: diagramHeight,
            centerX: diagramCenterX,
            centerY: diagramCenterY
          };
          
          // Använd fit-viewport - detta säkerställer att hela diagrammet syns
          canvas.zoom('fit-viewport', 'auto');
          
          // INTE zoom in mer - låt fit-viewport vara så diagrammet fyller viewporten korrekt
        } else {
          canvas.zoom('fit-viewport', 'auto');
        }
        
        setTimeout(() => {
          window.renderComplete = true;
        }, 2000);
      })
      .catch(err => {
        console.error('Error rendering BPMN:', err);
        window.renderError = err.message || 'Unknown error';
        window.renderComplete = true;
      });
  </script>
</body>
</html>`;
}

testSingleDiagram().catch(console.error);

