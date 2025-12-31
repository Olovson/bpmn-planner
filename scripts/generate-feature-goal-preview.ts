/**
 * Script to generate and preview Feature Goal documentation for internal data gathering
 */

import { buildBpmnProcessGraph } from '../src/lib/bpmnProcessGraph';
import { buildNodeDocumentationContext } from '../src/lib/documentationContext';
import { buildFeatureGoalDocModelFromContext, renderFeatureGoalDoc } from '../src/lib/documentationTemplates';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function generateFeatureGoalPreview() {
  const bpmnFile = 'mortgage-se-internal-data-gathering.bpmn';
  const bpmnFilePath = resolve(__dirname, '../tests/fixtures/bpmn', bpmnFile);
  
  // Read BPMN file
  const bpmnContent = readFileSync(bpmnFilePath, 'utf-8');
  
  // Build process graph
  const graph = await buildBpmnProcessGraph(bpmnFile, [bpmnFile]);
  
  // Find the process node
  const processNode = Array.from(graph.allNodes.values()).find(
    node => node.type === 'process' && node.bpmnFile === bpmnFile
  );
  
  if (!processNode) {
    throw new Error(`Could not find process node for ${bpmnFile}`);
  }
  
  // Build context - for a process node, we use the process node itself
  const nodeId = `${bpmnFile}::${processNode.bpmnElementId}`;
  const context = buildNodeDocumentationContext(graph, nodeId);
  
  if (!context) {
    throw new Error(`Could not build context for process node: ${nodeId}`);
  }
  
  // Build model from context
  const model = buildFeatureGoalDocModelFromContext(context);
  
  // Build HTML using renderFeatureGoalDoc (but we need LLM content, so we'll create a mock)
  // For preview purposes, we'll just show the model structure
  const links = {
    bpmnViewerLink: `#/bpmn-viewer/${bpmnFile}`,
    dmnLink: undefined,
    testLink: undefined,
  };
  
  // Create mock LLM content based on model
  const mockLlmContent = JSON.stringify({
    summary: model.summary || 'Intern datainsamling säkerställer att intern kunddata hämtas, kvalitetssäkras och görs tillgänglig för kreditbeslut.',
    flowSteps: model.flowSteps.length > 0 ? model.flowSteps : [
      'Systemet hämtar partsinformation från interna system',
      'Systemet utför pre-screening av kunden',
      'Om godkänd, hämtar systemet kundens befintliga engagemang',
      'Systemet sammanställer all data för kreditbedömning'
    ],
    dependencies: model.dependencies || [
      'Process: Ansökan måste vara initierad',
      'System: Interna kunddatabaser måste vara tillgängliga',
      'System: UC-integration för kreditupplysningar'
    ],
    userStories: model.userStories.length > 0 ? model.userStories : [
      {
        id: 'US-1',
        role: 'Handläggare',
        goal: 'Få komplett partsinformation automatiskt',
        value: 'Spara tid genom att inte behöva söka fram partsdata manuellt',
        acceptanceCriteria: [
          'Systemet hämtar partsinformation automatiskt när ansökan är initierad',
          'Systemet hämtar data från alla relevanta interna källor',
          'Systemet hanterar fel och timeouts på ett kontrollerat sätt'
        ]
      }
    ]
  }, null, 2);
  
  // Render HTML
  const html = await renderFeatureGoalDoc(context, links, mockLlmContent);
  
  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;
  
  console.log('='.repeat(80));
  console.log('FEATURE GOAL DOCUMENTATION PREVIEW');
  console.log('='.repeat(80));
  console.log('\n');
  console.log('BPMN File:', bpmnFile);
  console.log('Process Node:', processNode.bpmnElementId);
  console.log('Node Name:', processNode.name || processNode.bpmnElementId);
  console.log('\n');
  console.log('MODEL DATA:');
  console.log(JSON.stringify(model, null, 2));
  console.log('\n');
  console.log('='.repeat(80));
  console.log('HTML CONTENT:');
  console.log('='.repeat(80));
  console.log(bodyContent);
  console.log('\n');
  console.log('='.repeat(80));
}

generateFeatureGoalPreview().catch(console.error);

