/**
 * @vitest-environment jsdom
 * 
 * Integration test to verify that mortgage-se-household.bpmn generates
 * the correct number of documentation files:
 * - 1 Epic for the userTask "register-household-economy-information"
 * - 1 File-level documentation (mortgage-se-household.html)
 * - NO Feature Goal (subprocess-filer genererar INTE Feature Goals längre - ersatta av file-level docs)
 */

import { describe, it, expect } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';

describe('Household documentation generation', () => {
  it('should generate 2 documentation files for mortgage-se-household.bpmn (epic + file-level doc)', async () => {
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
    // - NO Feature Goals (subprocess-filer genererar INTE Feature Goals längre)
    expect(featureGoalKeys.length).toBe(0);
    
    // - Exactly 1 Epic (for the userTask)
    expect(epicKeys.length).toBe(1);
    
    // - Exactly 1 File-level doc (mortgage-se-household.html)
    expect(combinedDocKeys.length).toBe(1);
    
    // Total should be exactly 2 (Epic + File-level doc)
    expect(result.docs.size).toBe(2);
    
    // Verify Epic is for the userTask
    const householdEpic = epicKeys.find(key => 
      key.includes('register-household-economy-information')
    );
    expect(householdEpic).toBeDefined();
    
    // Verify File-level doc exists
    const fileLevelDoc = combinedDocKeys.find(key => 
      key === 'mortgage-se-household.html'
    );
    expect(fileLevelDoc).toBeDefined();
    
    console.log('\n✓ All assertions passed!');
  }, 30000);
});
