/**
 * @vitest-environment jsdom
 * 
 * Integration test to verify that mortgage-se-household.bpmn generates
 * the correct number of documentation files:
 * - 1 Feature Goal for the process itself
 * - 1 Epic for the userTask "register-household-economy-information"
 * - 1 Combined file-level doc
 */

import { describe, it, expect } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';

describe('Household documentation generation', () => {
  it('should generate 2 documentation files for mortgage-se-household.bpmn', async () => {
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-household.bpmn',
      ['mortgage-se-household.bpmn'],
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
      key === 'mortgage-se-household.html'
    );

    console.log('\n=== Categorized Files ===');
    console.log('Feature Goal keys:', featureGoalKeys);
    console.log('Epic keys:', epicKeys);
    console.log('Combined doc keys:', combinedDocKeys);

    // Verify we have:
    // - Exactly 1 Feature Goal (for the process)
    expect(featureGoalKeys.length).toBe(1);
    
    // - Exactly 1 Epic (for the userTask)
    expect(epicKeys.length).toBe(1);
    
    // - Exactly 1 Combined doc (file-level)
    expect(combinedDocKeys.length).toBe(1);
    
    // Total should be exactly 3 (Feature Goal + Epic + Combined)
    expect(result.docs.size).toBe(3);
    
    // Verify Feature Goal is for the household process
    const householdFeatureGoal = featureGoalKeys.find(key => 
      key.includes('mortgage-se-household') && !key.includes('register-household')
    );
    expect(householdFeatureGoal).toBeDefined();
    
    // Verify Epic is for the userTask
    const householdEpic = epicKeys.find(key => 
      key.includes('register-household-economy-information')
    );
    expect(householdEpic).toBeDefined();
    
    console.log('\n✓ All assertions passed!');
  }, 30000);
});
