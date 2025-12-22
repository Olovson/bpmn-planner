/**
 * @vitest-environment jsdom
 * 
 * Integration test to verify that mortgage-se-application.bpmn generates
 * the correct documentation files.
 * 
 * Expected output:
 * - 1 Feature Goal for the process itself (mortgage-se-application)
 * - Multiple Epics for userTasks/serviceTasks within the process
 * - NO Combined file-level doc (subprocesser genererar inte combined docs, bara root-processer)
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
    // - At least 1 Feature Goal (for the process)
    expect(featureGoalKeys.length).toBeGreaterThanOrEqual(1);
    
    // - At least 1 Epic (for tasks in the process)
    // mortgage-se-application.bpmn should have multiple tasks
    expect(epicKeys.length).toBeGreaterThanOrEqual(1);
    
    // - NO Combined doc for subprocesses (only root processes get combined docs)
    expect(combinedDocKeys.length).toBe(0);
    
    // Total should be at least: 1 Feature Goal + 1 Epic = 2 (no Combined for subprocesses)
    expect(result.docs.size).toBeGreaterThanOrEqual(2);
    
    // Verify Feature Goal is for the application process
    const applicationFeatureGoal = featureGoalKeys.find(key => 
      key.includes('mortgage-se-application')
    );
    expect(applicationFeatureGoal).toBeDefined();
    
    console.log('\n✓ All assertions passed!');
  }, 120000); // 2 minuter timeout (kan ta tid med bpmn-map loading)
});
