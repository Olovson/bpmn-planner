/**
 * Test Export Functionality
 * 
 * Exports test scripts for use in complete environment.
 * Generates export-ready test files with BPMN metadata and clear TODO markers.
 * 
 * See docs/STARTER_VS_COMPLETE_ENVIRONMENT.md for context
 */

import type { BpmnElement } from '@/lib/bpmnParser';
import type { EpicScenario } from './epicDocTypes';
import { generateExportReadyTest } from './exportReadyTestGenerator';
import { getTestFilePath } from './testContextGuard';
import { getTestScenariosFromHtml } from './htmlTestGenerationParser';

export interface ExportOptions {
  format: 'playwright' | 'jest' | 'mocha';
  includeBpmnMetadata: boolean;
  outputDirectory: string;
}

export interface ExportSummary {
  totalTests: number;
  withUiFlow: number;
  withPersona: number;
  withRiskLevel: number;
  needsCompleteEnvironment: number;
  exportedFiles: string[];
}

/**
 * Export tests for use in complete environment
 * 
 * This function will:
 * 1. Try to get scenarios from HTML (v2 Feature Goal documents) first
 * 2. Fall back to provided scenarios map if HTML is not available
 * 
 * @param elements - BPMN elements to export tests for
 * @param scenarios - Map of element ID to scenarios (fallback if HTML not available)
 * @param options - Export options
 * @param preferHtmlScenarios - If true, try to fetch scenarios from HTML first (default: true)
 * @returns Summary of exported tests
 */
export async function exportTestsForCompleteEnvironment(
  elements: BpmnElement[],
  scenarios: Map<string, EpicScenario[]>,
  options: ExportOptions,
  preferHtmlScenarios: boolean = true
): Promise<ExportSummary> {
  const summary: ExportSummary = {
    totalTests: 0,
    withUiFlow: 0,
    withPersona: 0,
    withRiskLevel: 0,
    needsCompleteEnvironment: 0,
    exportedFiles: [],
  };

  for (const element of elements) {
    let elementScenarios = scenarios.get(element.id) || [];

    // Try to get scenarios from HTML if this is a Feature Goal (CallActivity)
    if (preferHtmlScenarios && element.type === 'bpmn:CallActivity' && element.bpmnFile) {
      try {
        const htmlScenarios = await getTestScenariosFromHtml(
          element.bpmnFile,
          element.id,
          'v2'
        );
        
        if (htmlScenarios && htmlScenarios.length > 0) {
          // Use HTML scenarios, but merge with provided scenarios if needed
          // HTML scenarios take precedence
          elementScenarios = htmlScenarios;
          console.log(`[Export] Using ${htmlScenarios.length} scenarios from HTML for ${element.id}`);
        }
      } catch (error) {
        console.warn(`[Export] Could not fetch scenarios from HTML for ${element.id}:`, error);
        // Fall back to provided scenarios
      }
    }

    for (const scenario of elementScenarios) {
      const testCode = generateExportReadyTest(element, scenario, {
        includeBpmnMetadata: options.includeBpmnMetadata,
        includePlaceholders: true,
        exportFormat: options.format,
      });

      const filePath = getTestFilePath(
        'FICTIONAL_APP',
        `${element.id}-${scenario.id}`,
        { extension: '.spec.ts' }
      );

      const fullPath = `${options.outputDirectory}/${filePath}`;

      // In browser environment, we'll use download instead of writeFile
      // For now, return the code and let UI handle download
      summary.exportedFiles.push(fullPath);
      summary.totalTests++;

      if (scenario.uiFlow && scenario.uiFlow.length > 0) summary.withUiFlow++;
      if (scenario.persona) summary.withPersona++;
      if (scenario.riskLevel) summary.withRiskLevel++;
      summary.needsCompleteEnvironment++; // All need completion
    }
  }

  return summary;
}

/**
 * Generate export manifest
 */
export function generateExportManifest(
  summary: ExportSummary,
  options: ExportOptions
): string {
  const manifest = {
    exportDate: new Date().toISOString(),
    format: options.format,
    summary: {
      totalTests: summary.totalTests,
      withUiFlow: summary.withUiFlow,
      withPersona: summary.withPersona,
      withRiskLevel: summary.withRiskLevel,
      needsCompleteEnvironment: summary.needsCompleteEnvironment,
    },
    files: summary.exportedFiles.map((f) => ({
      path: f,
      status: 'ready-for-completion',
    })),
    instructions: {
      step1: 'Import tests to complete environment',
      step2: 'Add actual routes/endpoints',
      step3: 'Add actual UI locators',
      step4: 'Add test data fixtures',
      step5: 'Validate and run tests',
    },
    documentation: {
      exportGuide: 'docs/EXPORT_TO_COMPLETE_ENVIRONMENT.md',
      completionGuide: 'docs/COMPLETING_TESTS_IN_COMPLETE_ENVIRONMENT.md',
    },
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Generate test code for download
 * Returns a map of file paths to test code
 * 
 * This function will try to get scenarios from HTML first, then fall back to provided scenarios
 */
export async function generateTestFilesForExport(
  elements: BpmnElement[],
  scenarios: Map<string, EpicScenario[]>,
  options: ExportOptions,
  preferHtmlScenarios: boolean = true
): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  for (const element of elements) {
    let elementScenarios = scenarios.get(element.id) || [];

    // Try to get scenarios from HTML if this is a Feature Goal (CallActivity)
    if (preferHtmlScenarios && element.type === 'bpmn:CallActivity' && element.bpmnFile) {
      try {
        const htmlScenarios = await getTestScenariosFromHtml(
          element.bpmnFile,
          element.id,
          'v2'
        );
        
        if (htmlScenarios && htmlScenarios.length > 0) {
          elementScenarios = htmlScenarios;
          console.log(`[Export] Using ${htmlScenarios.length} scenarios from HTML for ${element.id}`);
        }
      } catch (error) {
        console.warn(`[Export] Could not fetch scenarios from HTML for ${element.id}:`, error);
        // Fall back to provided scenarios
      }
    }

    for (const scenario of elementScenarios) {
      const testCode = generateExportReadyTest(element, scenario, {
        includeBpmnMetadata: options.includeBpmnMetadata,
        includePlaceholders: true,
        exportFormat: options.format,
      });

      const filePath = getTestFilePath(
        'FICTIONAL_APP',
        `${element.id}-${scenario.id}`,
        { extension: '.spec.ts' }
      );

      const fullPath = `${options.outputDirectory}/${filePath}`;
      files.set(fullPath, testCode);
    }
  }

  return files;
}

