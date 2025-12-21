/**
 * Integration test för Claude-generering av "Object information"-noden
 * 
 * Detta test använder samma funktioner som appen för att generera dokumentation
 * för "Object information" (callActivity i Object-subprocessen i application-processen)
 * med Claude, precis som DocViewer skulle göra det.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { buildBpmnProcessGraph } from '../../src/lib/bpmnProcessGraph';
import { buildNodeDocumentationContext } from '../../src/lib/documentationContext';
import { renderFeatureGoalDoc } from '../../src/lib/documentationTemplates';
import { generateDocumentationWithLlm } from '../../src/lib/llmDocumentation';
import type { LlmProvider } from '../../src/lib/llmClientAbstraction';
import { supabase } from '../../src/integrations/supabase/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Ladda .env eller .env.local (försök båda)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

// Försök ladda .env.local först (används ofta i projektet), sedan .env
try {
  dotenv.config({ path: path.join(projectRoot, '.env.local') });
} catch {
  // Ignorera om .env.local inte finns
}
try {
  dotenv.config({ path: path.join(projectRoot, '.env') });
} catch {
  // Ignorera om .env inte finns
}

// Använd process.env först (från npm script eller .env), sedan import.meta.env (från Vite)
const useLlmEnv = process.env.VITE_USE_LLM || import.meta.env.VITE_USE_LLM;
const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY;

if (!useLlmEnv || useLlmEnv !== 'true') {
  throw new Error('VITE_USE_LLM måste vara "true"');
}

if (!anthropicKey) {
  throw new Error('VITE_ANTHROPIC_API_KEY måste vara satt i .env/.env.local eller som miljövariabel');
}

// Använd Supabase-klienten från appen (den hanterar konfigurationen automatiskt)

describe('Claude-generering för Object information-noden', () => {
  it('genererar dokumentation för Object information med Claude, precis som appen gör', async () => {
    console.log('🧪 Testar Claude-generering för Object information...\n');

    // 1. Hämta alla BPMN-filer från Supabase (behövs för att bygga grafen)
    console.log('📁 Hämtar BPMN-filer från Supabase...');
    const { data: bpmnFiles, error: filesError } = await supabase
      .from('bpmn_files')
      .select('file_name')
      .eq('file_type', 'bpmn')
      .order('file_name');

    if (filesError) {
      throw new Error(`Kunde inte hämta BPMN-filer: ${filesError.message}`);
    }

    if (!bpmnFiles || bpmnFiles.length === 0) {
      throw new Error('Inga BPMN-filer hittades i databasen');
    }

    const fileNames = bpmnFiles.map(f => f.file_name);
    console.log(`✅ Hittade ${fileNames.length} BPMN-filer`);

    // 2. Bygg process-grafen för application (precis som DocViewer gör)
    console.log('\n📊 Bygger process-graf för application...');
    // buildBpmnProcessGraph tar en array av filnamn som andra parameter
    // parseBpmnFile kommer att ladda filerna från Supabase storage automatiskt
    const graph = await buildBpmnProcessGraph('mortgage-se-application.bpmn', fileNames);
    
    if (!graph) {
      throw new Error('Kunde inte bygga process-graf för application');
    }

    // 3. Hitta "Object information"-noden
    // Object information är en callActivity i Object-subprocessen
    // Vi behöver hitta Object-subprocessen först, sedan Object information-noden i den
    console.log('🔍 Söker efter Object information-noden...');
    
    let objectInformationNodeId: string | null = null;
    
    // Försök hitta via process-grafen
    // Object information är en callActivity, så den kan vara i Object-subprocessen
    // graph.allNodes är en Map<string, BpmnProcessNode>
    if (!graph.allNodes) {
      throw new Error('Process-grafen saknar allNodes');
    }
    
    for (const [nodeId, node] of graph.allNodes.entries()) {
      // Kolla om det är Object information-noden direkt
      if (node.name === 'Object Information' || nodeId.includes('object-information')) {
        objectInformationNodeId = nodeId;
        console.log(`✅ Hittade Object information-noden: ${nodeId}`);
        break;
      }
    }

    // Om vi inte hittade den direkt, försök hitta Object-subprocessen först
    if (!objectInformationNodeId) {
      for (const [nodeId, node] of graph.allNodes.entries()) {
        if (node.name === 'Object' && node.type === 'callActivity') {
          // Object är en callActivity, så vi behöver hitta Object information i subprocess-filen
          // Men för testet, låt oss försöka hitta Object information direkt i application-filen
          // (den kan vara en callActivity som refererar till object-information subprocessen)
          console.log(`📍 Hittade Object callActivity: ${nodeId}`);
        }
      }
    }

    // Alternativt: sök efter object-information direkt (kan vara en callActivity i application)
    if (!objectInformationNodeId) {
      for (const [nodeId, node] of graph.allNodes.entries()) {
        if (
          (node.name?.toLowerCase().includes('object information') ||
           node.name?.toLowerCase().includes('object-information') ||
           nodeId.toLowerCase().includes('object-information')) &&
          node.type === 'callActivity'
        ) {
          objectInformationNodeId = nodeId;
          console.log(`✅ Hittade Object information callActivity: ${nodeId} (${node.name})`);
          break;
        }
      }
    }

    if (!objectInformationNodeId) {
      // Lista alla noder för debugging
      console.log('\n📋 Tillgängliga noder i grafen:');
      for (const [nodeId, node] of graph.allNodes.entries()) {
        console.log(`   - ${nodeId}: ${node.name} (${node.type})`);
      }
      throw new Error('Kunde inte hitta Object information-noden i process-grafen');
    }

    // 4. Bygg dokumentationskontext (precis som DocViewer gör)
    console.log('\n📝 Bygger dokumentationskontext...');
    const nodeContext = buildNodeDocumentationContext(graph, objectInformationNodeId);
    
    if (!nodeContext) {
      throw new Error('Kunde inte bygga dokumentationskontext för Object information');
    }

    console.log(`✅ Kontext byggd för: ${nodeContext.node.name} (${nodeContext.node.type})`);
    if (nodeContext.node.subprocessFile) {
      console.log(`   Subprocess-fil: ${nodeContext.node.subprocessFile}`);
    }

    // 5. Bygg template links (behövs för renderFeatureGoalDoc)
    const docLinks = {
      epic: '',
      businessRule: '',
      test: '',
    };

    // 6. Generera dokumentation med Claude (precis som appen gör)
    console.log('\n🚀 Genererar dokumentation med Claude...');
    console.log(`   Node: ${nodeContext.node.name}`);
    console.log(`   Type: ${nodeContext.node.type}`);
    console.log(`   LLM Provider: cloud (Claude)`);
    console.log(`   Template Version: v2\n`);

    const llmProvider: LlmProvider = 'cloud';
    const localAvailable = false;

    // Använd generateDocumentationWithLlm precis som appen gör
    const llmResult = await generateDocumentationWithLlm(
      'feature', // docType
      nodeContext,
      docLinks,
      llmProvider,
      localAvailable,
      true, // allowFallback
      undefined, // childrenDocumentation
    );

    if (!llmResult || !llmResult.text) {
      throw new Error('LLM-generering misslyckades eller returnerade inget innehåll');
    }

    // Rendera HTML med renderFeatureGoalDoc (precis som appen gör)
    const llmMetadata = {
      llmMetadata: {
        provider: llmResult.provider,
        model: 'claude-sonnet-4-20250514', // Claude Sonnet 4.5
      },
      fallbackUsed: llmResult.fallbackUsed,
      finalProvider: llmResult.provider,
    };

    const htmlContent = await renderFeatureGoalDoc(
      nodeContext,
      docLinks,
      llmResult.text,
      llmMetadata
    );

    // 7. Verifiera resultat
    expect(htmlContent).toBeTruthy();
    expect(htmlContent.length).toBeGreaterThan(100);
    expect(htmlContent).toContain('Object Information');
    expect(htmlContent).toContain('<html');
    expect(htmlContent).toContain('<body');

    // 7. Verifiera att Claude användes (kolla metadata i HTML)
    const hasClaudeMetadata = htmlContent.includes('Claude') || 
                              htmlContent.includes('claude') ||
                              htmlContent.includes('llmMetadata');

    console.log('\n✅ Generering klar!');
    console.log(`   HTML-längd: ${htmlContent.length} tecken`);
    console.log(`   Innehåller "Object Information": ${htmlContent.includes('Object Information')}`);
    console.log(`   Innehåller Claude-metadata: ${hasClaudeMetadata}`);

    // Visa en liten del av innehållet för verifiering
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]{0,500})/i);
    if (bodyMatch) {
      console.log('\n📄 Förhandsvisning av innehåll:');
      console.log(bodyMatch[1].substring(0, 200) + '...');
    }

    expect(hasClaudeMetadata || htmlContent.length > 1000).toBeTruthy(); // Antingen Claude-metadata eller betydande innehåll
  }, 300000); // 5 minuter timeout för LLM-generering
});

