/**
 * @vitest-environment jsdom
 * 
 * Detailed analysis of what SHOULD be generated for mortgage-se-signing.bpmn
 * based on the BPMN file structure.
 */

import { describe, it, expect } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { parseBpmnFile } from '@/lib/bpmnParser';

describe('Signing documentation - Expected vs Actual Analysis', () => {
  it('should analyze BPMN file and compare expected vs actual generation (isolated)', async () => {
    // 1. Parse BPMN file to count nodes
    const parseResult = await parseBpmnFile('/bpmn/mortgage-se-signing.bpmn');
    
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
    
    console.log('\n=== BPMN File Analysis (mortgage-se-signing.bpmn) ===');
    console.log('Processes:', processes.length);
    console.log('CallActivities:', callActivities.length, callActivities.map(ca => ca.id));
    console.log('Embedded SubProcesses (treated as callActivities):', embeddedSubProcesses.length, embeddedSubProcesses.map(sp => sp.id));
    console.log('UserTasks:', userTasks.length, userTasks.map(ut => ut.id));
    console.log('ServiceTasks:', serviceTasks.length, serviceTasks.map(st => st.id));
    console.log('BusinessRuleTasks:', businessRuleTasks.length, businessRuleTasks.map(brt => brt.id));
    
    // Expected documentation for isolated generation:
    // - 1 Feature Goal for the process itself (mortgage-se-signing)
    // - N Feature Goals for callActivities (one per callActivity) - should be 0
    // - M Feature Goals for embedded subProcesses (they are treated as callActivities)
    // - P Epics for tasks (userTask, serviceTask, businessRuleTask) - only top-level tasks, not tasks inside embedded subProcesses
    // - 1 Combined file-level doc
    
    // NOTE: Embedded subProcesses are treated as callActivities in the hierarchy
    // So they also generate Feature Goals
    const totalFeatureGoalNodes = callActivities.length + embeddedSubProcesses.length;
    const expectedFeatureGoals = 1 + totalFeatureGoalNodes; // Process + callActivities + embedded subProcesses
    // For isolated generation, only top-level tasks generate Epics (not tasks inside embedded subProcesses)
    const expectedEpics = userTasks.length + serviceTasks.length + businessRuleTasks.length;
    const expectedCombined = 0; // Subprocesser genererar INTE combined docs (bara root-processer)
    const expectedTotal = expectedFeatureGoals + expectedEpics + expectedCombined;
    
    console.log('\n=== Expected Documentation (Isolated Generation) ===');
    console.log(`Feature Goals: ${expectedFeatureGoals} (1 process + ${callActivities.length} callActivities + ${embeddedSubProcesses.length} embedded subProcesses)`);
    console.log(`Epics: ${expectedEpics} (${userTasks.length} userTasks + ${serviceTasks.length} serviceTasks + ${businessRuleTasks.length} businessRuleTasks - top-level only)`);
    console.log(`Combined doc: ${expectedCombined}`);
    console.log(`Total expected: ${expectedTotal}`);
    
    // 2. Generate documentation (isolated)
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-signing.bpmn',
      ['mortgage-se-signing.bpmn'],
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
      key === 'mortgage-se-signing.html'
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
    const parseResult = await parseBpmnFile('/bpmn/mortgage-se-signing.bpmn');
    
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
    
    console.log('\n=== BPMN File Analysis (mortgage-se-signing.bpmn) ===');
    console.log('Processes:', processes.length);
    console.log('CallActivities:', callActivities.length);
    console.log('Embedded SubProcesses:', embeddedSubProcesses.length);
    console.log('UserTasks:', userTasks.length);
    console.log('ServiceTasks:', serviceTasks.length);
    console.log('BusinessRuleTasks:', businessRuleTasks.length);
    
    // For hierarchy generation, we need to count ALL tasks including those inside embedded subProcesses
    // But mortgage-se-signing.bpmn has no callActivities to external files, so with hierarchy=true
    // we should get the same as isolated generation (no subprocess files to include)
    
    const totalFeatureGoalNodes = callActivities.length + embeddedSubProcesses.length;
    const expectedFeatureGoals = 1 + totalFeatureGoalNodes; // Process + callActivities + embedded subProcesses
    // With hierarchy, we still only get top-level tasks as Epics (tasks inside embedded subProcesses are not separate files)
    const expectedEpics = userTasks.length + serviceTasks.length + businessRuleTasks.length;
    const expectedCombined = 0; // Subprocesser genererar INTE combined docs (bara root-processer)
    const expectedTotal = expectedFeatureGoals + expectedEpics + expectedCombined;
    
    console.log('\n=== Expected Documentation (With Hierarchy) ===');
    console.log(`Feature Goals: ${expectedFeatureGoals} (1 process + ${callActivities.length} callActivities + ${embeddedSubProcesses.length} embedded subProcesses)`);
    console.log(`Epics: ${expectedEpics} (${userTasks.length} userTasks + ${serviceTasks.length} serviceTasks + ${businessRuleTasks.length} businessRuleTasks)`);
    console.log(`Combined doc: ${expectedCombined}`);
    console.log(`Total expected: ${expectedTotal}`);
    
    // 2. Generate documentation (with hierarchy)
    // Note: signing has no callActivities to external files, so hierarchy should be same as isolated
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-signing.bpmn',
      ['mortgage-se-signing.bpmn'], // Only signing file, no subprocess files
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
      key === 'mortgage-se-signing.html'
    );
    
    console.log('\n=== Actual Documentation (With Hierarchy) ===');
    console.log(`Feature Goals: ${featureGoalKeys.length}`);
    featureGoalKeys.forEach(key => console.log(`  - ${key}`));
    console.log(`Epics: ${epicKeys.length}`);
    epicKeys.forEach(key => console.log(`  - ${key}`));
    console.log(`Combined doc: ${combinedDocKeys.length}`);
    console.log(`Total actual: ${result.docs.size}`);
    
    // 4. Compare
    console.log('\n=== Comparison (With Hierarchy) ===');
    console.log(`Feature Goals: Expected ${expectedFeatureGoals}, Got ${featureGoalKeys.length} ${expectedFeatureGoals === featureGoalKeys.length ? '✓' : '✗'}`);
    console.log(`Epics: Expected ${expectedEpics}, Got ${epicKeys.length} ${expectedEpics === epicKeys.length ? '✓' : '✗'}`);
    console.log(`Combined: Expected ${expectedCombined}, Got ${combinedDocKeys.length} ${expectedCombined === combinedDocKeys.length ? '✓' : '✗'}`);
    console.log(`Total: Expected ${expectedTotal}, Got ${result.docs.size} ${expectedTotal === result.docs.size ? '✓' : '✗'}`);
    
    // 5. Assertions
    expect(featureGoalKeys.length).toBe(expectedFeatureGoals);
    expect(epicKeys.length).toBe(expectedEpics);
    expect(combinedDocKeys.length).toBe(expectedCombined);
    expect(result.docs.size).toBe(expectedTotal);
    
    console.log('\n✓ All assertions passed for hierarchy generation!');
  }, 30000);
});
