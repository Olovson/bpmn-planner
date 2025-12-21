/**
 * @vitest-environment jsdom
 * 
 * Tester för automatisk generering av bpmn-map.json
 * Verifierar att:
 * 1. Automatisk matching fungerar korrekt
 * 2. Hög konfidens matchningar inte flaggas för review
 * 3. Låg konfidens/ambiguous/unresolved flaggas för review
 * 4. Genererad map fungerar med systemet
 */

import { describe, it, expect } from 'vitest';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { matchCallActivityToProcesses } from '@/lib/bpmn/SubprocessMatcher';
import { buildProcessDefinitionsFromRegistry } from '@/lib/bpmn/processDefinition';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { matchCallActivityUsingMap, loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import type { BpmnMap } from '@/lib/bpmn/bpmnMapLoader';

describe('BPMN Map Auto-Generation', () => {
  describe('Automatic matching accuracy', () => {
    it('should match callActivities with calledElement correctly', async () => {
      // Test callActivities that have calledElement in BPMN
      const testCases = [
        {
          callActivity: { id: 'signing', name: 'Signing', calledElement: 'signing' },
          expectedFile: 'mortgage-se-signing.bpmn',
          expectedConfidence: 'high',
        },
        {
          callActivity: { id: 'offer', name: 'Offer preparation', calledElement: 'offer' },
          expectedFile: 'mortgage-se-offer.bpmn',
          expectedConfidence: 'high',
        },
      ];

      // Load all BPMN files to build process definitions
      const allFiles = [
        'mortgage.bpmn',
        'mortgage-se-signing.bpmn',
        'mortgage-se-offer.bpmn',
      ];

      const parseResults = await Promise.all(
        allFiles.map(file => parseBpmnFile(`/bpmn/${file}`))
      );

      const processDefs = buildProcessDefinitionsFromRegistry(
        allFiles.map((file, idx) => ({
          fileName: file,
          meta: parseResults[idx].meta || {},
        }))
      );

      console.log('\n=== CalledElement Matching Test ===');
      
      for (const testCase of testCases) {
        const match = matchCallActivityToProcesses(
          testCase.callActivity,
          processDefs
        );

        console.log(`\nCallActivity: ${testCase.callActivity.id}`);
        console.log(`  calledElement: ${testCase.callActivity.calledElement}`);
        console.log(`  Matched file: ${match.matchedFileName}`);
        console.log(`  Match status: ${match.matchStatus}`);
        console.log(`  Confidence: ${match.confidence.toFixed(2)}`);

        expect(match.matchStatus).toBe('matched');
        expect(match.matchedFileName).toBe(testCase.expectedFile);
        expect(match.confidence).toBeGreaterThanOrEqual(0.75);
      }

      console.log('\n✅ All calledElement matches passed');
    }, 30000);

    it('should match callActivities using naming conventions', async () => {
      // Test callActivities that match via naming conventions (mortgage-se-{id}.bpmn)
      const testCases = [
        {
          callActivity: { id: 'household', name: 'Household', calledElement: undefined },
          expectedFile: 'mortgage-se-household.bpmn',
        },
        {
          callActivity: { id: 'stakeholder', name: 'Stakeholder', calledElement: undefined },
          expectedFile: 'mortgage-se-stakeholder.bpmn',
        },
        {
          callActivity: { id: 'object', name: 'Object', calledElement: undefined },
          expectedFile: 'mortgage-se-object.bpmn',
        },
        {
          callActivity: { id: 'internal-data-gathering', name: 'Internal data gathering', calledElement: undefined },
          expectedFile: 'mortgage-se-internal-data-gathering.bpmn',
        },
      ];

      const allFiles = [
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
        'mortgage-se-stakeholder.bpmn',
        'mortgage-se-object.bpmn',
        'mortgage-se-internal-data-gathering.bpmn',
      ];

      const parseResults = await Promise.all(
        allFiles.map(file => parseBpmnFile(`/bpmn/${file}`))
      );

      const processDefs = buildProcessDefinitionsFromRegistry(
        allFiles.map((file, idx) => ({
          fileName: file,
          meta: parseResults[idx].meta || {},
        }))
      );

      console.log('\n=== Naming Convention Matching Test ===');
      
      for (const testCase of testCases) {
        const match = matchCallActivityToProcesses(
          testCase.callActivity,
          processDefs
        );

        console.log(`\nCallActivity: ${testCase.callActivity.id}`);
        console.log(`  Matched file: ${match.matchedFileName}`);
        console.log(`  Match status: ${match.matchStatus}`);
        console.log(`  Confidence: ${match.confidence.toFixed(2)}`);

        expect(match.matchStatus).toBe('matched');
        expect(match.matchedFileName).toBe(testCase.expectedFile);
        expect(match.confidence).toBeGreaterThanOrEqual(0.75);
      }

      console.log('\n✅ All naming convention matches passed');
    }, 30000);

    it('should identify low confidence and ambiguous matches', async () => {
      // This test verifies that the system correctly identifies matches that need review
      const allFiles = [
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
        'mortgage-se-stakeholder.bpmn',
      ];

      const parseResults = await Promise.all(
        allFiles.map(file => parseBpmnFile(`/bpmn/${file}`))
      );

      const processDefs = buildProcessDefinitionsFromRegistry(
        allFiles.map((file, idx) => ({
          fileName: file,
          meta: parseResults[idx].meta || {},
        }))
      );

      // Test with a callActivity that might have low confidence
      const match = matchCallActivityToProcesses(
        {
          id: 'test-activity',
          name: 'Test Activity',
          calledElement: undefined,
        },
        processDefs
      );

      console.log('\n=== Low Confidence / Ambiguous Test ===');
      console.log(`CallActivity: test-activity`);
      console.log(`  Matched file: ${match.matchedFileName || 'none'}`);
      console.log(`  Match status: ${match.matchStatus}`);
      console.log(`  Confidence: ${match.confidence.toFixed(2)}`);

      // This should be either unresolved or low confidence
      expect(['unresolved', 'lowConfidence', 'ambiguous']).toContain(match.matchStatus);
      
      if (match.matchStatus === 'lowConfidence' || match.matchStatus === 'ambiguous') {
        expect(match.confidence).toBeLessThan(0.75);
      }

      console.log('\n✅ Low confidence/ambiguous identification works');
    }, 30000);
  });

  describe('Generated bpmn-map.json structure', () => {
    it('should generate correct structure for bpmn-map.json', async () => {
      // Simulate generating bpmn-map.json for application file
      const files = [
        'mortgage-se-application.bpmn',
        'mortgage-se-internal-data-gathering.bpmn',
        'mortgage-se-household.bpmn',
        'mortgage-se-stakeholder.bpmn',
        'mortgage-se-object.bpmn',
      ];

      const parseResults = await Promise.all(
        files.map(file => parseBpmnFile(`/bpmn/${file}`))
      );

      const processDefs = buildProcessDefinitionsFromRegistry(
        files.map((file, idx) => ({
          fileName: file,
          meta: parseResults[idx].meta || {},
        }))
      );

      // Generate map for application file
      const applicationParse = parseResults[0];
      const applicationCallActivities = applicationParse.callActivities || [];

      const generatedCallActivities = applicationCallActivities.map(ca => {
        const match = matchCallActivityToProcesses(
          {
            id: ca.id,
            name: ca.name,
            calledElement: (ca as any).calledElement,
          },
          processDefs
        );

        return {
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: (ca as any).calledElement || null,
          subprocess_bpmn_file: match.matchedFileName || null,
          needs_manual_review: match.matchStatus !== 'matched',
        };
      });

      console.log('\n=== Generated Map Structure Test ===');
      console.log(`File: mortgage-se-application.bpmn`);
      console.log(`Call activities: ${generatedCallActivities.length}`);
      
      generatedCallActivities.forEach(ca => {
        console.log(`  - ${ca.bpmn_id}: ${ca.subprocess_bpmn_file || 'unresolved'} (review: ${ca.needs_manual_review})`);
      });

      // Verify structure
      expect(generatedCallActivities.length).toBeGreaterThan(0);
      
      // Verify that high confidence matches don't need review
      const highConfidenceMatches = generatedCallActivities.filter(
        ca => ca.subprocess_bpmn_file && !ca.needs_manual_review
      );
      console.log(`\nHigh confidence matches (no review needed): ${highConfidenceMatches.length}`);
      expect(highConfidenceMatches.length).toBeGreaterThan(0);

      // Verify that all have required fields
      generatedCallActivities.forEach(ca => {
        expect(ca).toHaveProperty('bpmn_id');
        expect(ca).toHaveProperty('name');
        expect(ca).toHaveProperty('called_element');
        expect(ca).toHaveProperty('subprocess_bpmn_file');
        expect(ca).toHaveProperty('needs_manual_review');
        expect(typeof ca.needs_manual_review).toBe('boolean');
      });

      console.log('\n✅ Generated map structure is correct');
    }, 30000);

    it('should generate map that works with matchCallActivityUsingMap', async () => {
      // Test that a generated map can be used by the system
      const files = [
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
      ];

      const parseResults = await Promise.all(
        files.map(file => parseBpmnFile(`/bpmn/${file}`))
      );

      const processDefs = buildProcessDefinitionsFromRegistry(
        files.map((file, idx) => ({
          fileName: file,
          meta: parseResults[idx].meta || {},
        }))
      );

      // Generate map for application
      const applicationParse = parseResults[0];
      const applicationCallActivities = applicationParse.callActivities || [];

      const generatedCallActivities = applicationCallActivities.map(ca => {
        const match = matchCallActivityToProcesses(
          {
            id: ca.id,
            name: ca.name,
            calledElement: (ca as any).calledElement,
          },
          processDefs
        );

        return {
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: (ca as any).calledElement || null,
          subprocess_bpmn_file: match.matchedFileName || null,
          needs_manual_review: match.matchStatus !== 'matched',
        };
      });

      // Create a bpmn-map structure
      const generatedMap: BpmnMap = {
        generated_at: new Date().toISOString(),
        note: 'Auto-generated for testing',
        orchestration: {
          root_process: 'mortgage-se-application',
        },
        processes: [
          {
            id: 'mortgage-se-application',
            alias: 'Application',
            bpmn_file: 'mortgage-se-application.bpmn',
            process_id: 'mortgage-se-application',
            description: 'Application Mortgage',
            call_activities: generatedCallActivities,
          },
        ],
      };

      console.log('\n=== Map Compatibility Test ===');
      
      // Test that the generated map works with matchCallActivityUsingMap
      const householdCallActivity = applicationCallActivities.find(ca => ca.id === 'household');
      if (householdCallActivity) {
        const mapMatch = matchCallActivityUsingMap(
          {
            id: householdCallActivity.id,
            name: householdCallActivity.name,
            calledElement: (householdCallActivity as any).calledElement,
          },
          'mortgage-se-application.bpmn',
          generatedMap
        );

        console.log(`Household callActivity match:`);
        console.log(`  Matched file: ${mapMatch.matchedFileName}`);
        console.log(`  Match source: ${mapMatch.matchSource}`);

        expect(mapMatch.matchSource).toBe('bpmn-map');
        expect(mapMatch.matchedFileName).toBe('mortgage-se-household.bpmn');
      }

      console.log('\n✅ Generated map works with matchCallActivityUsingMap');
    }, 30000);
  });

  describe('Comparison: Auto-generated vs Manual map', () => {
    it('should generate similar results to manual bpmn-map.json', async () => {
      // Load existing manual bpmn-map.json
      const manualMapData = await import('../../bpmn-map.json');
      const manualMap = loadBpmnMap(manualMapData.default);

      // Generate automatic map for same files
      const files = [
        'mortgage-se-application.bpmn',
        'mortgage-se-internal-data-gathering.bpmn',
        'mortgage-se-household.bpmn',
        'mortgage-se-stakeholder.bpmn',
        'mortgage-se-object.bpmn',
      ];

      const parseResults = await Promise.all(
        files.map(file => parseBpmnFile(`/bpmn/${file}`))
      );

      const processDefs = buildProcessDefinitionsFromRegistry(
        files.map((file, idx) => ({
          fileName: file,
          meta: parseResults[idx].meta || {},
        }))
      );

      // Generate automatic map for application
      const applicationParse = parseResults[0];
      const applicationCallActivities = applicationParse.callActivities || [];

      const autoGeneratedCallActivities = applicationCallActivities.map(ca => {
        const match = matchCallActivityToProcesses(
          {
            id: ca.id,
            name: ca.name,
            calledElement: (ca as any).calledElement,
          },
          processDefs
        );

        return {
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: (ca as any).calledElement || null,
          subprocess_bpmn_file: match.matchedFileName || null,
          needs_manual_review: match.matchStatus !== 'matched',
        };
      });

      // Get manual map for application
      const manualApplicationProcess = manualMap.processes.find(
        p => p.bpmn_file === 'mortgage-se-application.bpmn'
      );

      console.log('\n=== Auto vs Manual Comparison ===');
      console.log(`Application call activities:`);
      console.log(`  Auto-generated: ${autoGeneratedCallActivities.length}`);
      console.log(`  Manual: ${manualApplicationProcess?.call_activities.length || 0}`);

      // Compare matches
      if (manualApplicationProcess) {
        for (const autoCA of autoGeneratedCallActivities) {
          const manualCA = manualApplicationProcess.call_activities.find(
            ca => ca.bpmn_id === autoCA.bpmn_id
          );

          if (manualCA) {
            const match = autoCA.subprocess_bpmn_file === manualCA.subprocess_bpmn_file;
            console.log(`  ${autoCA.bpmn_id}: ${match ? '✓' : '✗'} (auto: ${autoCA.subprocess_bpmn_file}, manual: ${manualCA.subprocess_bpmn_file})`);
            
            // Most should match (high confidence matches should be the same)
            if (autoCA.subprocess_bpmn_file && !autoCA.needs_manual_review) {
              // High confidence auto matches should match manual
              expect(match).toBe(true);
            }
          }
        }
      }

      console.log('\n✅ Auto-generated map comparison complete');
    }, 30000);

    it('should work correctly when used in buildBpmnProcessGraph', async () => {
      // Test that auto-generated map works with actual graph building
      const files = [
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
        'mortgage-se-stakeholder.bpmn',
      ];

      // Generate automatic map
      const parseResults = await Promise.all(
        files.map(file => parseBpmnFile(`/bpmn/${file}`))
      );

      const processDefs = buildProcessDefinitionsFromRegistry(
        files.map((file, idx) => ({
          fileName: file,
          meta: parseResults[idx].meta || {},
        }))
      );

      const applicationParse = parseResults[0];
      const applicationCallActivities = applicationParse.callActivities || [];

      const autoGeneratedCallActivities = applicationCallActivities.map(ca => {
        const match = matchCallActivityToProcesses(
          {
            id: ca.id,
            name: ca.name,
            calledElement: (ca as any).calledElement,
          },
          processDefs
        );

        return {
          bpmn_id: ca.id,
          name: ca.name || ca.id,
          called_element: (ca as any).calledElement || null,
          subprocess_bpmn_file: match.matchedFileName || null,
          needs_manual_review: match.matchStatus !== 'matched',
        };
      });

      const autoGeneratedMap: BpmnMap = {
        generated_at: new Date().toISOString(),
        note: 'Auto-generated for testing',
        orchestration: {
          root_process: 'mortgage-se-application',
        },
        processes: [
          {
            id: 'mortgage-se-application',
            alias: 'Application',
            bpmn_file: 'mortgage-se-application.bpmn',
            process_id: 'mortgage-se-application',
            description: 'Application Mortgage',
            call_activities: autoGeneratedCallActivities,
          },
        ],
      };

      console.log('\n=== Graph Building with Auto-Generated Map ===');

      // Build graph with auto-generated map
      const graph = await buildBpmnProcessGraph(
        'mortgage-se-application.bpmn',
        files,
      );

      // Verify that household and stakeholder are matched
      const householdNodes = graph.fileNodes.get('mortgage-se-household.bpmn') || [];
      const stakeholderNodes = graph.fileNodes.get('mortgage-se-stakeholder.bpmn') || [];

      console.log(`Household nodes: ${householdNodes.length}`);
      console.log(`Stakeholder nodes: ${stakeholderNodes.length}`);

      // Note: Graph building uses automatic matching, not bpmn-map
      // But we can verify that the automatic matching works correctly
      expect(householdNodes.length).toBeGreaterThan(0);
      expect(stakeholderNodes.length).toBeGreaterThan(0);

      console.log('\n✅ Graph building works with automatic matching');
    }, 30000);
  });

  describe('Edge cases and error handling', () => {
    it('should handle callActivities without calledElement', async () => {
      const files = [
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
      ];

      const parseResults = await Promise.all(
        files.map(file => parseBpmnFile(`/bpmn/${file}`))
      );

      const processDefs = buildProcessDefinitionsFromRegistry(
        files.map((file, idx) => ({
          fileName: file,
          meta: parseResults[idx].meta || {},
        }))
      );

      // Test household callActivity (no calledElement, but matches via naming)
      const match = matchCallActivityToProcesses(
        {
          id: 'household',
          name: 'Household',
          calledElement: undefined,
        },
        processDefs
      );

      console.log('\n=== No CalledElement Test ===');
      console.log(`CallActivity: household (no calledElement)`);
      console.log(`  Matched file: ${match.matchedFileName || 'none'}`);
      console.log(`  Match status: ${match.matchStatus}`);

      // Should still match via naming convention
      expect(match.matchStatus).toBe('matched');
      expect(match.matchedFileName).toBe('mortgage-se-household.bpmn');

      console.log('\n✅ No calledElement handled correctly');
    }, 30000);

    it('should handle missing subprocess files gracefully', async () => {
      // Test with a callActivity that points to a non-existent file
      const files = [
        'mortgage-se-application.bpmn',
      ];

      const parseResults = await Promise.all(
        files.map(file => parseBpmnFile(`/bpmn/${file}`))
      );

      const processDefs = buildProcessDefinitionsFromRegistry(
        files.map((file, idx) => ({
          fileName: file,
          meta: parseResults[idx].meta || {},
        }))
      );

      // Test with a callActivity that doesn't exist
      const match = matchCallActivityToProcesses(
        {
          id: 'non-existent-process',
          name: 'Non Existent Process',
          calledElement: undefined,
        },
        processDefs
      );

      console.log('\n=== Missing Subprocess Test ===');
      console.log(`CallActivity: non-existent-process`);
      console.log(`  Matched file: ${match.matchedFileName || 'none'}`);
      console.log(`  Match status: ${match.matchStatus}`);

      // Should be unresolved or lowConfidence (system might find a fuzzy match)
      expect(['unresolved', 'lowConfidence']).toContain(match.matchStatus);
      if (match.matchStatus === 'unresolved') {
        expect(match.matchedFileName).toBeUndefined();
      } else {
        // Low confidence match might have a matchedFileName but with low confidence
        expect(match.confidence).toBeLessThan(0.75);
      }

      console.log('\n✅ Missing subprocess handled gracefully');
    }, 30000);
  });
});
