/**
 * @vitest-environment jsdom
 * 
 * Detailed analysis of what SHOULD be generated for mortgage.bpmn
 * based on the BPMN file structure.
 */

import { describe, it, expect } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { parseBpmnFile } from '@/lib/bpmnParser';

describe('Mortgage documentation - Expected vs Actual Analysis', () => {
  it('should analyze BPMN file and compare expected vs actual generation (isolated)', async () => {
    // 1. Parse BPMN file to count nodes
    const parseResult = await parseBpmnFile('/bpmn/mortgage.bpmn');
    
    // Count nodes by type
    const callActivities = parseResult.callActivities || [];
    const userTasks = parseResult.userTasks || [];
    const serviceTasks = parseResult.serviceTasks || [];
    const businessRuleTasks = parseResult.businessRuleTasks || [];
    const processes = parseResult.meta?.processes || [];
    const subProcesses = parseResult.subprocesses || [];
    
    // IMPORTANT: Embedded subProcess nodes are also treated as callActivities in the hierarchy
    // They are added to subprocessCandidates and processed the same way as callActivities
    // So we need to count both callActivities AND embedded subProcesses for Feature Goals
    const processMeta = processes[0];
    const subprocessCandidates = processMeta?.subprocessCandidates || [];
    const embeddedSubProcesses = subprocessCandidates.filter(sp => sp.kind === 'subProcess');
    
    console.log('\n=== BPMN File Analysis (mortgage.bpmn) ===');
    console.log('Processes:', processes.length);
    console.log('CallActivities:', callActivities.length, callActivities.map(ca => ca.id));
    console.log('Embedded SubProcesses (treated as callActivities):', embeddedSubProcesses.length, embeddedSubProcesses.map(sp => sp.id));
    console.log('UserTasks:', userTasks.length, userTasks.map(ut => ut.id));
    console.log('ServiceTasks:', serviceTasks.length, serviceTasks.map(st => st.id));
    console.log('BusinessRuleTasks:', businessRuleTasks.length, businessRuleTasks.map(brt => brt.id));
    
    // Expected documentation for isolated generation:
    // - 1 Feature Goal for the process itself (mortgage)
    // - N Feature Goals for callActivities (one per callActivity)
    // - M Feature Goals for embedded subProcesses (they are treated as callActivities)
    // - P Epics for tasks (userTask, serviceTask, businessRuleTask) - only top-level tasks
    // - 1 Combined file-level doc
    
    // NOTE: Embedded subProcesses are treated as callActivities in the hierarchy
    // So they also generate Feature Goals
    const totalFeatureGoalNodes = callActivities.length + embeddedSubProcesses.length;
    const expectedFeatureGoals = 1 + totalFeatureGoalNodes; // Process + callActivities + embedded subProcesses
    // For isolated generation, only top-level tasks generate Epics (not tasks inside embedded subProcesses)
    const expectedEpics = userTasks.length + serviceTasks.length + businessRuleTasks.length;
    const expectedCombined = 1;
    const expectedTotal = expectedFeatureGoals + expectedEpics + expectedCombined;
    
    console.log('\n=== Expected Documentation (Isolated Generation) ===');
    console.log(`Feature Goals: ${expectedFeatureGoals} (1 process + ${callActivities.length} callActivities + ${embeddedSubProcesses.length} embedded subProcesses)`);
    console.log(`Epics: ${expectedEpics} (${userTasks.length} userTasks + ${serviceTasks.length} serviceTasks + ${businessRuleTasks.length} businessRuleTasks - top-level only)`);
    console.log(`Combined doc: ${expectedCombined}`);
    console.log(`Total expected: ${expectedTotal}`);
    
    // 2. Generate documentation (isolated)
    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      ['mortgage.bpmn'],
      [],
      false, // useHierarchy = false (isolated generation)
      false, // useLlm = false (use templates, not LLM)
    );
    
    // 3. Categorize actual results
    const featureGoalKeys = Array.from(result.docs.keys()).filter(key => 
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    const epicKeys = Array.from(result.docs.keys()).filter(key => 
      key.includes('nodes') && !key.includes('feature-goal')
    );
    const combinedDocKeys = Array.from(result.docs.keys()).filter(key => 
      key === 'mortgage.html'
    );
    
    console.log('\n=== Actual Documentation (Isolated Generation) ===');
    console.log(`Feature Goals: ${featureGoalKeys.length}`);
    featureGoalKeys.forEach(key => console.log(`  - ${key}`));
    console.log(`Epics: ${epicKeys.length}`);
    epicKeys.forEach(key => console.log(`  - ${key}`));
    console.log(`Combined doc: ${combinedDocKeys.length}`);
    console.log(`Total actual: ${result.docs.size}`);
    
    // 4. Compare
    console.log('\n=== Comparison (Isolated Generation) ===');
    console.log(`Feature Goals: Expected ${expectedFeatureGoals}, Got ${featureGoalKeys.length} ${expectedFeatureGoals === featureGoalKeys.length ? '✓' : '✗'}`);
    console.log(`Epics: Expected ${expectedEpics}, Got ${epicKeys.length} ${expectedEpics === epicKeys.length ? '✓' : '✗'}`);
    console.log(`Combined: Expected ${expectedCombined}, Got ${combinedDocKeys.length} ${expectedCombined === combinedDocKeys.length ? '✓' : '✗'}`);
    console.log(`Total: Expected ${expectedTotal}, Got ${result.docs.size} ${expectedTotal === result.docs.size ? '✓' : '✗'}`);
    
    // 5. Assertions
    expect(featureGoalKeys.length).toBe(expectedFeatureGoals);
    expect(epicKeys.length).toBe(expectedEpics);
    expect(combinedDocKeys.length).toBe(expectedCombined);
    expect(result.docs.size).toBe(expectedTotal);
    
    console.log('\n✓ All assertions passed for isolated generation!');
  }, 30000);

  it('should analyze BPMN file and compare expected vs actual generation (with hierarchy)', async () => {
    // 1. Parse BPMN file to count nodes
    const parseResult = await parseBpmnFile('/bpmn/mortgage.bpmn');
    
    // Count nodes by type
    const callActivities = parseResult.callActivities || [];
    const userTasks = parseResult.userTasks || [];
    const serviceTasks = parseResult.serviceTasks || [];
    const businessRuleTasks = parseResult.businessRuleTasks || [];
    const processes = parseResult.meta?.processes || [];
    const subProcesses = parseResult.subprocesses || [];
    
    // IMPORTANT: Embedded subProcess nodes are also treated as callActivities in the hierarchy
    const processMeta = processes[0];
    const subprocessCandidates = processMeta?.subprocessCandidates || [];
    const embeddedSubProcesses = subprocessCandidates.filter(sp => sp.kind === 'subProcess');
    
    console.log('\n=== BPMN File Analysis (mortgage.bpmn) ===');
    console.log('Processes:', processes.length);
    console.log('CallActivities:', callActivities.length);
    console.log('Embedded SubProcesses:', embeddedSubProcesses.length);
    console.log('UserTasks:', userTasks.length);
    console.log('ServiceTasks:', serviceTasks.length);
    console.log('BusinessRuleTasks:', businessRuleTasks.length);
    
    // For hierarchy generation, we need to include all subprocess files
    // Based on bpmn-map.json and integration tests, mortgage.bpmn references:
    // - mortgage-se-application.bpmn
    // - mortgage-se-credit-evaluation.bpmn
    // - mortgage-se-credit-decision.bpmn
    // - mortgage-se-offer.bpmn
    // - mortgage-se-document-generation.bpmn
    // - mortgage-se-signing.bpmn
    // - mortgage-se-disbursement.bpmn
    // - mortgage-se-collateral-registration.bpmn
    // - mortgage-se-mortgage-commitment.bpmn
    // - mortgage-se-kyc.bpmn
    // - mortgage-se-appeal.bpmn
    // - mortgage-se-manual-credit-evaluation.bpmn
    // And potentially more...
    
    // For now, let's just verify that with hierarchy, we get Feature Goals for all callActivities
    // and Epics for all tasks in mortgage.bpmn itself (not subprocess tasks, those are in their own files)
    const totalFeatureGoalNodes = callActivities.length + embeddedSubProcesses.length;
    const expectedFeatureGoals = 1 + totalFeatureGoalNodes; // Process + callActivities + embedded subProcesses
    // With hierarchy, we still only get top-level tasks in mortgage.bpmn as Epics
    // Tasks in subprocess files generate their own Epics in those files
    const expectedEpics = userTasks.length + serviceTasks.length + businessRuleTasks.length;
    const expectedCombined = 1;
    const expectedTotal = expectedFeatureGoals + expectedEpics + expectedCombined;
    
    console.log('\n=== Expected Documentation (With Hierarchy - mortgage.bpmn only) ===');
    console.log(`Feature Goals: ${expectedFeatureGoals} (1 process + ${callActivities.length} callActivities + ${embeddedSubProcesses.length} embedded subProcesses)`);
    console.log(`Epics: ${expectedEpics} (${userTasks.length} userTasks + ${serviceTasks.length} serviceTasks + ${businessRuleTasks.length} businessRuleTasks - top-level only)`);
    console.log(`Combined doc: ${expectedCombined}`);
    console.log(`Total expected: ${expectedTotal}`);
    console.log('\nNOTE: With hierarchy, subprocess files generate their own documentation separately.');
    console.log('This test only verifies documentation for mortgage.bpmn itself.');
    
    // 2. Generate documentation (with hierarchy, but only mortgage.bpmn in scope)
    // This simulates generating for mortgage.bpmn without including subprocess files
    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      ['mortgage.bpmn'], // Only mortgage file, no subprocess files
      [],
      true, // useHierarchy = true
      false, // useLlm = false (use templates, not LLM)
    );
    
    // 3. Categorize actual results
    const featureGoalKeys = Array.from(result.docs.keys()).filter(key => 
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    const epicKeys = Array.from(result.docs.keys()).filter(key => 
      key.includes('nodes') && !key.includes('feature-goal')
    );
    const combinedDocKeys = Array.from(result.docs.keys()).filter(key => 
      key === 'mortgage.html'
    );
    
    console.log('\n=== Actual Documentation (With Hierarchy - mortgage.bpmn only) ===');
    console.log(`Feature Goals: ${featureGoalKeys.length}`);
    featureGoalKeys.forEach(key => console.log(`  - ${key}`));
    console.log(`Epics: ${epicKeys.length}`);
    epicKeys.forEach(key => console.log(`  - ${key}`));
    console.log(`Combined doc: ${combinedDocKeys.length}`);
    console.log(`Total actual: ${result.docs.size}`);
    
    // 4. Compare
    console.log('\n=== Comparison (With Hierarchy - mortgage.bpmn only) ===');
    console.log(`Feature Goals: Expected ${expectedFeatureGoals}, Got ${featureGoalKeys.length} ${expectedFeatureGoals === featureGoalKeys.length ? '✓' : '✗'}`);
    console.log(`Epics: Expected ${expectedEpics}, Got ${epicKeys.length} ${expectedEpics === epicKeys.length ? '✓' : '✗'}`);
    console.log(`Combined: Expected ${expectedCombined}, Got ${combinedDocKeys.length} ${expectedCombined === combinedDocKeys.length ? '✓' : '✗'}`);
    console.log(`Total: Expected ${expectedTotal}, Got ${result.docs.size} ${expectedTotal === result.docs.size ? '✓' : '✗'}`);
    
    // 5. Assertions
    expect(featureGoalKeys.length).toBe(expectedFeatureGoals);
    expect(epicKeys.length).toBe(expectedEpics);
    expect(combinedDocKeys.length).toBe(expectedCombined);
    expect(result.docs.size).toBe(expectedTotal);
    
    console.log('\n✓ All assertions passed for hierarchy generation (mortgage.bpmn only)!');
  }, 30000);

  it('should analyze BPMN file and compare expected vs actual generation (with full hierarchy - all subprocess files)', async () => {
    // 1. Parse BPMN file to count nodes
    const parseResult = await parseBpmnFile('/bpmn/mortgage.bpmn');
    
    // Count nodes by type
    const callActivities = parseResult.callActivities || [];
    const userTasks = parseResult.userTasks || [];
    const serviceTasks = parseResult.serviceTasks || [];
    const businessRuleTasks = parseResult.businessRuleTasks || [];
    const processes = parseResult.meta?.processes || [];
    
    const processMeta = processes[0];
    const subprocessCandidates = processMeta?.subprocessCandidates || [];
    const embeddedSubProcesses = subprocessCandidates.filter(sp => sp.kind === 'subProcess');
    
    console.log('\n=== BPMN File Analysis (mortgage.bpmn) ===');
    console.log('Processes:', processes.length);
    console.log('CallActivities:', callActivities.length);
    console.log('Embedded SubProcesses:', embeddedSubProcesses.length);
    console.log('UserTasks:', userTasks.length);
    console.log('ServiceTasks:', serviceTasks.length);
    console.log('BusinessRuleTasks:', businessRuleTasks.length);
    
    // For full hierarchy generation, we include all subprocess files
    // Based on bpmn-map.json and integration tests, mortgage.bpmn references these subprocess files:
    const allSubprocessFiles = [
      'mortgage-se-application.bpmn',
      'mortgage-se-credit-evaluation.bpmn',
      'mortgage-se-credit-decision.bpmn',
      'mortgage-se-offer.bpmn',
      'mortgage-se-document-generation.bpmn',
      'mortgage-se-signing.bpmn',
      'mortgage-se-disbursement.bpmn',
      'mortgage-se-collateral-registration.bpmn',
      'mortgage-se-mortgage-commitment.bpmn',
      'mortgage-se-kyc.bpmn',
      'mortgage-se-appeal.bpmn',
      'mortgage-se-manual-credit-evaluation.bpmn',
    ];
    
    console.log('\n=== Subprocess Files to Include ===');
    console.log('Subprocess files:', allSubprocessFiles.length);
    allSubprocessFiles.forEach(file => console.log(`  - ${file}`));
    
    // Expected documentation for full hierarchy generation:
    // - Feature Goals: 1 (mortgage process) + N (callActivities) + M (embedded subProcesses) + Feature Goals from all subprocess files
    // - Epics: Tasks in mortgage.bpmn + Tasks in all subprocess files
    // - Combined docs: One for each file
    
    // For now, let's just verify that we get more documentation with hierarchy than without
    const totalFeatureGoalNodes = callActivities.length + embeddedSubProcesses.length;
    const expectedFeatureGoalsMortgage = 1 + totalFeatureGoalNodes; // Process + callActivities + embedded subProcesses
    const expectedEpicsMortgage = userTasks.length + serviceTasks.length + businessRuleTasks.length;
    
    console.log('\n=== Expected Documentation (Full Hierarchy) ===');
    console.log(`Feature Goals from mortgage.bpmn: ${expectedFeatureGoalsMortgage}`);
    console.log(`Epics from mortgage.bpmn: ${expectedEpicsMortgage}`);
    console.log(`Plus Feature Goals and Epics from ${allSubprocessFiles.length} subprocess files`);
    console.log(`Plus ${allSubprocessFiles.length + 1} Combined docs (1 per file)`);
    
    // 2. Generate documentation (with full hierarchy)
    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      ['mortgage.bpmn', ...allSubprocessFiles],
      [],
      true, // useHierarchy = true
      false, // useLlm = false (use templates, not LLM)
    );
    
    // 3. Categorize actual results
    const featureGoalKeys = Array.from(result.docs.keys()).filter(key => 
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    const epicKeys = Array.from(result.docs.keys()).filter(key => 
      key.includes('nodes') && !key.includes('feature-goal')
    );
    const combinedDocKeys = Array.from(result.docs.keys()).filter(key => 
      key.endsWith('.html') && !key.includes('feature-goal') && !key.includes('nodes')
    );
    
    console.log('\n=== Actual Documentation (Full Hierarchy) ===');
    console.log(`Feature Goals: ${featureGoalKeys.length}`);
    featureGoalKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
    if (featureGoalKeys.length > 10) {
      console.log(`  ... and ${featureGoalKeys.length - 10} more`);
    }
    console.log(`Epics: ${epicKeys.length}`);
    epicKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
    if (epicKeys.length > 10) {
      console.log(`  ... and ${epicKeys.length - 10} more`);
    }
    console.log(`Combined docs: ${combinedDocKeys.length}`);
    combinedDocKeys.forEach(key => console.log(`  - ${key}`));
    console.log(`Total actual: ${result.docs.size}`);
    
    // 4. Verify we have more with hierarchy than without
    console.log('\n=== Comparison (Full Hierarchy) ===');
    console.log(`Feature Goals: Got ${featureGoalKeys.length} (expected at least ${expectedFeatureGoalsMortgage} from mortgage.bpmn + more from subprocesses)`);
    console.log(`Epics: Got ${epicKeys.length} (expected at least ${expectedEpicsMortgage} from mortgage.bpmn + more from subprocesses)`);
    console.log(`Combined docs: Got ${combinedDocKeys.length} (expected ${allSubprocessFiles.length + 1} - one per file)`);
    console.log(`Total: Got ${result.docs.size} documents`);
    
    // 5. Assertions - verify we have at least the mortgage.bpmn documentation
    expect(featureGoalKeys.length).toBeGreaterThanOrEqual(expectedFeatureGoalsMortgage);
    expect(epicKeys.length).toBeGreaterThanOrEqual(expectedEpicsMortgage);
    expect(combinedDocKeys.length).toBe(allSubprocessFiles.length + 1); // One per file
    expect(result.docs.size).toBeGreaterThan(expectedFeatureGoalsMortgage + expectedEpicsMortgage + 1); // More than just mortgage.bpmn
    
    console.log('\n✓ All assertions passed for full hierarchy generation!');
  }, 60000);
});
