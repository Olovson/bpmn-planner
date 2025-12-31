/**
 * @vitest-environment jsdom
 * 
 * Integration test to verify that mortgage-se-application.bpmn generates
 * the correct documentation files.
 * 
 * Expected output:
 * - Multiple Epics for userTasks/serviceTasks within the process
 * - 1 File-level documentation (mortgage-se-application.html)
 * - NO Feature Goal (subprocess-filer genererar INTE Feature Goals längre - ersatta av file-level docs)
 */

import { describe, it, expect } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';

describe('Application documentation generation', () => {
  it('should generate correct documentation files for mortgage-se-application.bpmn', async () => {
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      ['mortgage-se-application.bpmn'],
      [],
      false, // useHierarchy = false (isolated generation)
      false, // useLlm = false (use templates, not LLM)
    );

    // Debug: log all generated doc keys
    console.log('\n=== Generated Documentation Files ===');
    console.log('Total docs:', result.docs.size);
    console.log('All doc keys:', Array.from(result.docs.keys()));

    // Categorize files
    const featureGoalKeys = Array.from(result.docs.keys()).filter(key => 
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    const epicKeys = Array.from(result.docs.keys()).filter(key => 
      key.includes('nodes') && !key.includes('feature-goal')
    );
    const combinedDocKeys = Array.from(result.docs.keys()).filter(key => 
      key === 'mortgage-se-application.html'
    );

    console.log('\n=== Categorized Files ===');
    console.log('Feature Goal keys:', featureGoalKeys);
    console.log('Epic keys:', epicKeys);
    console.log('Combined doc keys:', combinedDocKeys);
    console.log('\n=== Epic Details ===');
    epicKeys.forEach(key => {
      const parts = key.split('/');
      const elementId = parts[parts.length - 1].replace('.html', '');
      console.log(`  - ${elementId}`);
    });

    // Verify we have:
    // - NO Feature Goals (subprocess-filer genererar INTE Feature Goals längre)
    expect(featureGoalKeys.length).toBe(0);
    
    // - At least 1 Epic (for tasks in the process)
    // mortgage-se-application.bpmn should have multiple tasks
    expect(epicKeys.length).toBeGreaterThanOrEqual(1);
    
    // - Exactly 1 File-level doc (mortgage-se-application.html)
    expect(combinedDocKeys.length).toBe(1);
    
    // Total should be at least: 1 Epic + 1 File-level doc = 2
    expect(result.docs.size).toBeGreaterThanOrEqual(2);
    
    // Verify File-level doc exists
    const fileLevelDoc = combinedDocKeys.find(key => 
      key === 'mortgage-se-application.html'
    );
    expect(fileLevelDoc).toBeDefined();
    
    console.log('\n✓ All assertions passed!');
  }, 120000); // 2 minuter timeout (kan ta tid med bpmn-map loading)
});
