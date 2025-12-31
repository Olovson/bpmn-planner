import { BpmnElement, BpmnSubprocess } from '@/lib/bpmnParser';
import type { GenerationResult, NodeArtifactEntry } from './types';
import { generateDocumentationHTML, parseDmnSummary, type SubprocessSummary } from '../bpmnGenerators/documentationGenerator';
import { generateDorDodCriteria, generateDorDodForNodeType } from '../bpmnGenerators/dorDodGenerators';
import { insertGenerationMeta } from '../bpmnGenerators/docRendering';
import { getNodeDocFileKey } from '@/lib/nodeArtifactPaths';
import type { LlmProvider } from '../llmClientAbstraction';

/**
 * Legacy function for backward compatibility
 * Generates documentation for all elements in a BPMN file without using the graph-based approach
 */
export async function generateAllFromBpmn(
  elements: BpmnElement[],
  subprocesses: BpmnSubprocess[],
  existingBpmnFiles: string[],
  existingDmnFiles: string[] = [],
  bpmnFileName?: string,
  useLlm: boolean = true,
  generationSourceLabel?: string,
  llmProvider?: LlmProvider
): Promise<GenerationResult> {
  const result: GenerationResult = {
    tests: new Map(),
    docs: new Map(),
    dorDod: new Map(),
    subprocessMappings: new Map(),
  };
  const docSource = generationSourceLabel || (useLlm ? 'llm' : 'local');
  const nodeArtifacts: NodeArtifactEntry[] = [];
  result.nodeArtifacts = nodeArtifacts;

  // Samla dokumentation för alla element i filen
  let combinedDoc = '';
  if (bpmnFileName) {
    combinedDoc = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dokumentation - ${bpmnFileName}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 16px; background: #ffffff; }
    h1 { font-size: 1.5rem; margin: 0 0 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    h2 { color: #1e40af; margin-top: 24px; font-size: 1.1rem; }
    .node-section { border-left: 3px solid #dbeafe; padding-left: 16px; margin: 16px 0; }
    .node-type { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 4px; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>Dokumentation för ${bpmnFileName}</h1>
`;
  }

  // Generate for each element
  for (const element of elements) {
    let docContent: string | null = null;
    let nodeTestFileKey: string | null = null;
    const nodeType = element.type.replace('bpmn:', '') as 'ServiceTask' | 'UserTask' | 'BusinessRuleTask' | 'CallActivity' | string;
    
    // Skip process definitions and labels
    if (nodeType === 'Process' || nodeType === 'Collaboration' || element.type === 'label') {
      continue;
    }

    // === TESTGENERERING HAR FLYTTATS TILL SEPARAT STEG ===
    // Testfiler och testscenarion genereras inte längre i dokumentationssteget.
    // Använd separat testgenereringsfunktion istället.
    nodeTestFileKey = undefined;
      
    // Generate DoR/DoD criteria for individual elements
    // Use hyphen for normalization (consistent with subprocess IDs)
    const normalizedName = (element.name || element.id)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
      
    if (nodeType === 'ServiceTask' || nodeType === 'UserTask' || nodeType === 'BusinessRuleTask' || nodeType === 'CallActivity') {
      const criteria = generateDorDodForNodeType(
        nodeType as 'ServiceTask' | 'UserTask' | 'BusinessRuleTask' | 'CallActivity',
        normalizedName
      );
      
      // Add node metadata to each criterion
      const enrichedCriteria = criteria.map(c => ({
        ...c,
        node_type: nodeType,
        bpmn_element_id: element.id,
        bpmn_file: bpmnFileName
      }));
      
      result.dorDod.set(normalizedName, enrichedCriteria);
    }

    // Generate documentation with subprocess/DMN info
    let subprocessFile: string | undefined;
    let subprocessSummary: SubprocessSummary | undefined;
    
    if (nodeType === 'CallActivity') {
      subprocessFile = undefined; // Legacy läge utan hierarki gör ingen deterministisk matchning
    } else if (nodeType === 'BusinessRuleTask') {
      // Match DMN file for BusinessRuleTask
      const { matchDmnFile } = await import('../dmnParser');
      subprocessFile = matchDmnFile(element.name || element.id, existingDmnFiles);
      
      // Parse DMN if file exists
      if (subprocessFile && existingDmnFiles.includes(subprocessFile)) {
        subprocessSummary = await parseDmnSummary(subprocessFile) || undefined;
        result.subprocessMappings.set(element.id, subprocessFile);
      }
    }
    
    if (['UserTask', 'ServiceTask', 'BusinessRuleTask', 'CallActivity'].includes(nodeType)) {
      docContent = generateDocumentationHTML(element, subprocessFile, subprocessSummary);
      const docFileKey = bpmnFileName
        ? getNodeDocFileKey(bpmnFileName, element.id)
        : `${element.id}.html`;
      result.docs.set(docFileKey, insertGenerationMeta(docContent, docSource));
      
      nodeArtifacts.push({
        bpmnFile: bpmnFileName || '',
        elementId: element.id,
        elementName: element.name || element.id,
        docFileName: docFileKey,
        testFileName: nodeTestFileKey || undefined,
      });
    }

    if (bpmnFileName) {
      if (!docContent) {
        docContent = generateDocumentationHTML(element, subprocessFile, subprocessSummary);
      }
      const bodyMatch = docContent.match(/<body>([\s\S]*)<\/body>/);
      if (bodyMatch) {
        combinedDoc += `<div class="node-section">
  <span class="node-type">${nodeType}</span>
  <h2>${element.name || element.id}</h2>
  ${bodyMatch[1]}
</div>
`;
      }
    }
  }

  // Avsluta och spara kombinerad dokumentation
  if (bpmnFileName && combinedDoc) {
    combinedDoc += `
</body>
</html>`;
    const docFileName = bpmnFileName.replace('.bpmn', '.html');
    result.docs.set(docFileName, insertGenerationMeta(combinedDoc, docSource));
  }

  // Generate DoR/DoD for subprocesses (legacy support)
  subprocesses.forEach(subprocess => {
    const criteria = generateDorDodCriteria(subprocess.name, 'CallActivity');
    // Use hyphen for normalization
    const normalizedName = subprocess.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    // Only add if not already added from elements loop
    if (!result.dorDod.has(normalizedName)) {
      result.dorDod.set(normalizedName, criteria);
    }
  });

  return result;
}

import { testMapping, type TestScenario } from '@/data/testMapping';

/**
 * Hämta design-scenarion från testMapping och mappa dem till formatet
 * som används av generateTestSkeleton. Används enbart för lokal generering
 * (useLlm = false) så vi inte ändrar LLM-beteendet.
 */
export function getDesignScenariosForElement(
  element: BpmnElement,
): { name: string; description: string; expectedResult?: string; steps?: string[] }[] | undefined {
  const mapping = testMapping[element.id];
  if (!mapping || !mapping.scenarios || mapping.scenarios.length === 0) {
    return undefined;
  }

  const scenarios = mapping.scenarios.map((s: TestScenario) => ({
    name: s.name,
    description: s.description,
    expectedResult: s.description,
    // steps lämnas tomma så generateTestSkeleton genererar generiska TODO-kommentarer
  }));

  return scenarios.length ? scenarios : undefined;
}

