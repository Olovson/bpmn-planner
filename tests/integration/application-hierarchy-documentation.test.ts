/**
 * @vitest-environment jsdom
 * 
 * Test to verify what happens when generating for mortgage-se-application.bpmn
 * WITH hierarchy enabled. Should generate documentation for all nodes in subprocesses too.
 */

import { describe, it, expect } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';

describe('Application documentation with hierarchy', () => {
  it('should generate documentation for all nodes including subprocess nodes when useHierarchy=true', async () => {
    // Generate WITH hierarchy - should include all subprocess files
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      [
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
        'mortgage-se-stakeholder.bpmn',
        'mortgage-se-object.bpmn',
        'mortgage-se-internal-data-gathering.bpmn',
      ],
      [],
      true, // useHierarchy = true (include subprocess files)
      false, // useLlm = false (use templates, not LLM)
    );

    // Debug: Check what files were analyzed
    console.log('\n=== Generation Metadata ===');
    console.log('Metadata:', result.metadata);
    console.log('Files included:', result.metadata?.filesIncluded);
    console.log('Hierarchy used:', result.metadata?.hierarchyUsed);
    console.log('Total files analyzed:', result.metadata?.totalFilesAnalyzed);
    
    // Debug: Check what nodes exist in the graph by file
    console.log('\n=== Debug: What should be generated? ===');
    console.log('When generating for application with hierarchy, we should generate:');
    console.log('  - Epics for ALL tasks in application file');
    console.log('  - Epics for ALL tasks in subprocess files (household, stakeholder, object, internal-data-gathering)');
    console.log('  - But currently only application epics are generated');
    console.log('\nThis suggests that nodes from subprocess files are not in analyzedFiles');
    
    console.log('\n=== Generated Documentation WITH Hierarchy ===');
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
      key.endsWith('.html') && !key.includes('feature-goal') && !key.includes('nodes')
    );

    console.log('\n=== Categorized Files ===');
    console.log('Feature Goals:', featureGoalKeys.length);
    featureGoalKeys.forEach(key => console.log(`  - ${key}`));
    console.log('Epics:', epicKeys.length);
    epicKeys.forEach(key => {
      const parts = key.split('/');
      const fileName = parts[parts.length - 2] || 'unknown';
      const elementId = parts[parts.length - 1]?.replace('.html', '') || 'unknown';
      console.log(`  - ${fileName}::${elementId}`);
    });
    console.log('Combined docs:', combinedDocKeys.length);
    combinedDocKeys.forEach(key => console.log(`  - ${key}`));

    // With hierarchy, we should have:
    // - Feature Goals for application process + all callActivities/subProcesses
    // - Epics for ALL tasks in application AND in subprocess files
    // - Combined docs for each file
    
    // At minimum, we should have epics from household (register-household-economy-information)
    const householdEpics = epicKeys.filter(key => key.includes('household'));
    console.log('\n=== Household Epics ===');
    householdEpics.forEach(key => console.log(`  - ${key}`));

    // We should have MORE epics with hierarchy than without
    expect(epicKeys.length).toBeGreaterThan(4); // More than the 4 from application alone
    
    // Should have epics from household subprocess
    expect(householdEpics.length).toBeGreaterThan(0);
    
    console.log('\n✓ Hierarchy test passed!');
  }, 60000);
});
