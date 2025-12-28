/**
 * Parser for extracting test generation information from Feature Goal HTML files
 * 
 * This parser reads the "Testgenerering" section from HTML and converts it
 * into structured data that can be used for test generation and export.
 */

import { supabase } from './supabaseClient';
import type { EpicScenario } from './epicDocTypes';
import type { ScenarioUiStep } from './epicDocTypes';
import type { ScenarioPersona, ScenarioRiskLevel, ScenarioAssertionType } from './epicDocTypes';
import { getFeatureGoalDocFileKey } from './nodeArtifactPaths';
import { loadBpmnMapFromStorage } from './bpmn/bpmnMapStorage';
import { findParentBpmnFileForSubprocess } from './bpmn/bpmnMapLoader';

export interface ParsedTestScenario {
  id: string;
  name: string;
  type: 'Happy' | 'Edge' | 'Error';
  persona: ScenarioPersona;
  riskLevel: ScenarioRiskLevel;
  assertionType: ScenarioAssertionType;
  outcome: string;
  status: string;
  uiFlow?: ScenarioUiStep[];
}

export interface ParsedTestDataReference {
  id: string;
  description: string;
}

export interface ParsedImplementationMapping {
  activity: string;
  type: 'UI' | 'API' | 'Both';
  route: string;
  method: string;
  baseUrl: string;
  comment: string;
}

export interface ParsedTestGeneration {
  scenarios: ParsedTestScenario[];
  testDataReferences: ParsedTestDataReference[];
  implementationMapping: ParsedImplementationMapping[];
}

/**
 * Parse test generation section from HTML content
 */
export function parseTestGenerationFromHtml(html: string): ParsedTestGeneration | null {
  // Check if test generation section exists
  if (!html.includes('<h2>Testgenerering</h2>')) {
    return null;
  }

  // Extract the test generation section
  const sectionMatch = html.match(/<h2>Testgenerering<\/h2>([\s\S]*?)(?=<h2>|<\/body>|$)/i);
  if (!sectionMatch) {
    return null;
  }

  const sectionContent = sectionMatch[1];

  // Parse scenarios
  const scenarios = parseScenarios(sectionContent);

  // Parse test data references
  const testDataReferences = parseTestDataReferences(sectionContent);

  // Parse implementation mapping
  const implementationMapping = parseImplementationMapping(sectionContent);

  return {
    scenarios,
    testDataReferences,
    implementationMapping,
  };
}

/**
 * Parse test scenarios from HTML table
 */
function parseScenarios(sectionContent: string): ParsedTestScenario[] {
  const scenarios: ParsedTestScenario[] = [];

  // Find the scenarios table
  const tableMatch = sectionContent.match(/<h3>Testscenarier<\/h3>[\s\S]*?<table>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tableMatch) {
    return scenarios;
  }

  const tbodyContent = tableMatch[1];
  const rowMatches = Array.from(tbodyContent.matchAll(/<tr>([\s\S]*?)<\/tr>/gi));

  for (const rowMatch of rowMatches) {
    const rowContent = rowMatch[1];
    const cellMatches = Array.from(rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
    const cells: string[] = [];

    for (const cellMatch of cellMatches) {
      const cellText = cellMatch[1]
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(cellText);
    }

    // Expected columns: ID, Name, Type, Persona, Risk Level, Assertion Type, Outcome, Status
    if (cells.length >= 8) {
      const id = cells[0].replace(/[^\w-]/g, ''); // Clean ID
      const name = cells[1];
      const type = cells[2] as 'Happy' | 'Edge' | 'Error';
      const persona = parsePersona(cells[3]);
      const riskLevel = parseRiskLevel(cells[4]);
      const assertionType = parseAssertionType(cells[5]);
      const outcome = cells[6];
      const status = cells[7];

      // Parse UI Flow for this scenario
      const uiFlow = parseUiFlowForScenario(sectionContent, id);

      scenarios.push({
        id,
        name,
        type,
        persona,
        riskLevel,
        assertionType,
        outcome,
        status,
        uiFlow: uiFlow.length > 0 ? uiFlow : undefined,
      });
    }
  }

  return scenarios;
}

/**
 * Parse UI Flow steps for a specific scenario
 */
function parseUiFlowForScenario(sectionContent: string, scenarioId: string): ScenarioUiStep[] {
  const steps: ScenarioUiStep[] = [];

  // Find the details section for this scenario
  const scenarioPattern = new RegExp(
    `<details[^>]*>\\s*<summary[^>]*>\\s*<strong>${scenarioId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:[^<]*</strong>[\\s\\S]*?</summary>([\\s\\S]*?)</details>`,
    'i'
  );

  const detailsMatch = sectionContent.match(scenarioPattern);
  if (!detailsMatch) {
    return steps;
  }

  const detailsContent = detailsMatch[1];

  // Find the UI Flow table
  const tableMatch = detailsContent.match(/<table[^>]*>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tableMatch) {
    return steps;
  }

  const tbodyContent = tableMatch[1];
  const rowMatches = Array.from(tbodyContent.matchAll(/<tr>([\s\S]*?)<\/tr>/gi));

  for (const rowMatch of rowMatches) {
    const rowContent = rowMatch[1];
    const cellMatches = Array.from(rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
    const cells: string[] = [];

    for (const cellMatch of cellMatches) {
      const cellText = cellMatch[1]
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(cellText);
    }

    // Expected columns: Step, Page ID, Action, Locator ID, Data Profile, Comment
    if (cells.length >= 6) {
      const stepNum = parseInt(cells[0], 10);
      const pageId = cells[1];
      const action = cells[2];
      const locatorId = cells[3];
      const dataProfileId = cells[4];
      const comment = cells[5];

      // Skip if it's a TODO placeholder (unless it's a valid step)
      if (pageId.includes('[TODO') || locatorId.includes('[TODO') || dataProfileId.includes('[TODO')) {
        // Still include it, but mark as incomplete
      }

      // Parse action type
      let actionType: 'navigate' | 'click' | 'fill' | 'submit' | 'verify' | undefined;
      const actionLower = action.toLowerCase();
      if (actionLower === 'navigate' || actionLower === 'navigera') actionType = 'navigate';
      else if (actionLower === 'click' || actionLower === 'klicka') actionType = 'click';
      else if (actionLower === 'fill' || actionLower === 'fyll') actionType = 'fill';
      else if (actionLower === 'submit' || actionLower === 'skicka') actionType = 'submit';
      else if (actionLower === 'verify' || actionLower === 'verifiera') actionType = 'verify';
      else if (action !== '-' && action !== '') actionType = action as any; // Fallback

      steps.push({
        pageId: pageId === '-' || pageId === '' || pageId.includes('[TODO') ? undefined : pageId,
        action: actionType,
        locatorId: locatorId === '-' || locatorId === '' || locatorId.includes('[TODO') ? undefined : locatorId,
        dataProfileId: dataProfileId === '-' || dataProfileId === '' || dataProfileId.includes('[TODO') ? undefined : dataProfileId,
      });
    }
  }

  return steps;
}

/**
 * Parse test data references from HTML list
 */
function parseTestDataReferences(sectionContent: string): ParsedTestDataReference[] {
  const references: ParsedTestDataReference[] = [];

  // Find the test data references section
  const sectionMatch = sectionContent.match(/<h3>Testdata-referenser<\/h3>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
  if (!sectionMatch) {
    return references;
  }

  const ulContent = sectionMatch[1];
  const itemMatches = Array.from(ulContent.matchAll(/<li>([\s\S]*?)<\/li>/gi));

  for (const itemMatch of itemMatches) {
    const itemText = itemMatch[1]
      .replace(/<strong>([^<]+)<\/strong>/gi, '$1') // Extract strong text
      .replace(/<[^>]+>/g, '') // Remove other HTML tags
      .trim();

    // Expected format: "id: description"
    const colonIndex = itemText.indexOf(':');
    if (colonIndex > 0) {
      const id = itemText.substring(0, colonIndex).trim();
      const description = itemText.substring(colonIndex + 1).trim();

      // Skip TODO placeholders if they're the only content
      if (!id.includes('[TODO') && !description.includes('[TODO')) {
        references.push({ id, description });
      }
    }
  }

  return references;
}

/**
 * Parse implementation mapping from HTML table
 */
function parseImplementationMapping(sectionContent: string): ParsedImplementationMapping[] {
  const mappings: ParsedImplementationMapping[] = [];

  // Find the implementation mapping table
  const tableMatch = sectionContent.match(/<h3>Implementation Mapping<\/h3>[\s\S]*?<table>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tableMatch) {
    return mappings;
  }

  const tbodyContent = tableMatch[1];
  const rowMatches = Array.from(tbodyContent.matchAll(/<tr>([\s\S]*?)<\/tr>/gi));

  for (const rowMatch of rowMatches) {
    const rowContent = rowMatch[1];
    const cellMatches = Array.from(rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
    const cells: string[] = [];

    for (const cellMatch of cellMatches) {
      const cellText = cellMatch[1]
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(cellText);
    }

    // Expected columns: Activity, Type, Route/Endpoint, Method, Base URL, Comment
    if (cells.length >= 6) {
      const activity = cells[0];
      const type = cells[1] as 'UI' | 'API' | 'Both';
      const route = cells[2];
      const method = cells[3];
      const baseUrl = cells[4];
      const comment = cells[5];

      // Skip if it's all TODO placeholders
      if (!route.includes('[TODO') || !baseUrl.includes('[TODO')) {
        mappings.push({
          activity,
          type,
          route,
          method: method === '-' ? '' : method,
          baseUrl,
          comment,
        });
      }
    }
  }

  return mappings;
}

/**
 * Convert parsed scenario to EpicScenario format
 */
export function convertParsedScenarioToEpicScenario(
  parsed: ParsedTestScenario,
  elementId?: string
): EpicScenario {
  return {
    id: parsed.id,
    name: parsed.name,
    type: parsed.type,
    description: parsed.outcome,
    outcome: parsed.outcome,
    persona: parsed.persona,
    riskLevel: parsed.riskLevel,
    assertionType: parsed.assertionType,
    uiFlow: parsed.uiFlow,
    // dataProfileId can be extracted from uiFlow if needed
    dataProfileId: parsed.uiFlow?.find(step => step.dataProfileId)?.dataProfileId,
  };
}

/**
 * Parse persona string to ScenarioPersona enum
 */
function parsePersona(value: string): ScenarioPersona {
  const lower = value.toLowerCase();
  if (lower === 'customer' || lower === 'kund') return 'customer';
  if (lower === 'advisor' || lower === 'handläggare') return 'advisor';
  if (lower === 'system') return 'system';
  return 'unknown';
}

/**
 * Parse risk level string to ScenarioRiskLevel enum
 */
function parseRiskLevel(value: string): ScenarioRiskLevel {
  const upper = value.toUpperCase();
  if (upper === 'P0' || upper.startsWith('P0')) return 'P0';
  if (upper === 'P1' || upper.startsWith('P1')) return 'P1';
  if (upper === 'P2' || upper.startsWith('P2')) return 'P2';
  return 'P1'; // Default
}

/**
 * Parse assertion type string to ScenarioAssertionType enum
 */
function parseAssertionType(value: string): ScenarioAssertionType {
  const lower = value.toLowerCase();
  if (lower === 'functional' || lower === 'funktionell') return 'functional';
  if (lower === 'regression' || lower === 'regression') return 'regression';
  if (lower === 'compliance' || lower === 'efterlevnad') return 'compliance';
  return 'other';
}

/**
 * Fetch HTML content for a Feature Goal document
 * Tries local-content first, then Supabase Storage
 */
export async function fetchFeatureGoalHtml(
  bpmnFile: string,
  elementId: string,
  parentBpmnFile?: string,
): Promise<string | null> {
  // Hitta parentBpmnFile om den saknas
  let resolvedParentBpmnFile = parentBpmnFile;
  if (!resolvedParentBpmnFile) {
    try {
      const bpmnMapResult = await loadBpmnMapFromStorage();
      if (bpmnMapResult.valid && bpmnMapResult.map) {
        resolvedParentBpmnFile = findParentBpmnFileForSubprocess(
          bpmnFile,
          elementId,
          bpmnMapResult.map
        ) || undefined;
      }
    } catch (error) {
      console.warn(`[htmlTestGenerationParser] Could not load bpmn-map to find parent for ${bpmnFile}::${elementId}:`, error);
    }
  }

  // Om parentBpmnFile saknas, kan vi inte ladda Feature Goal (kastar fel i getFeatureGoalDocFileKey)
  if (!resolvedParentBpmnFile) {
    return null;
  }

  const fileKey = getFeatureGoalDocFileKey(bpmnFile, elementId, undefined, resolvedParentBpmnFile); // no version suffix
  const filename = fileKey.replace('feature-goals/', '');

  // Try local-content first
  {
    try {
      const localPath = `/local-content/feature-goals/${filename}`;
      const response = await fetch(localPath, { cache: 'no-store' });
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      // Continue to Supabase Storage
    }
  }

  // Try Supabase Storage
  try {
    // Try different possible paths (Claude-only)
    const possiblePaths = [
      `docs/claude/${fileKey}`,
      `docs/${fileKey}`,
      fileKey,
    ];

    for (const path of possiblePaths) {
      const { data } = supabase.storage.from('bpmn-files').getPublicUrl(path);
      if (!data?.publicUrl) continue;

      const versionedUrl = `${data.publicUrl}?t=${Date.now()}`;
      const response = await fetch(versionedUrl, { cache: 'no-store' });
      if (response.ok) {
        return await response.text();
      }
    }
  } catch (error) {
    console.error('Error fetching HTML from Supabase Storage:', error);
  }

  return null;
}

/**
 * Get test scenarios from HTML for a Feature Goal
 * Returns null if HTML cannot be fetched or parsed
 */
export async function getTestScenariosFromHtml(
  bpmnFile: string,
  elementId: string,
  parentBpmnFile?: string,
): Promise<EpicScenario[] | null> {
  const html = await fetchFeatureGoalHtml(bpmnFile, elementId, parentBpmnFile);
  if (!html) {
    return null;
  }

  const parsed = parseTestGenerationFromHtml(html);
  if (!parsed || parsed.scenarios.length === 0) {
    return null;
  }

  // Convert parsed scenarios to EpicScenario format
  return parsed.scenarios.map(scenario => convertParsedScenarioToEpicScenario(scenario, elementId));
}

