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
 * @param elements - BPMN elements to export tests for
 * @param scenarios - Map of element ID to scenarios
 * @param options - Export options
 * @returns Summary of exported tests
 */
export async function exportTestsForCompleteEnvironment(
  elements: BpmnElement[],
  scenarios: Map<string, EpicScenario[]>,
  options: ExportOptions
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
    const elementScenarios = scenarios.get(element.id) || [];

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
 */
export function generateTestFilesForExport(
  elements: BpmnElement[],
  scenarios: Map<string, EpicScenario[]>,
  options: ExportOptions
): Map<string, string> {
  const files = new Map<string, string>();

  for (const element of elements) {
    const elementScenarios = scenarios.get(element.id) || [];

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

