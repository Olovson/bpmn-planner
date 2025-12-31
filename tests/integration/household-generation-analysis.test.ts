/**
 * @vitest-environment jsdom
 * 
 * Analys av vad som genereras när household genereras:
 * - Hur många filer genereras?
 * - Hur många gånger genereras information?
 * - Vad händer om household genereras isolerat vs med hierarchy?
 */

import { describe, it, expect } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { parseBpmnFile } from '@/lib/bpmnParser';

describe('Household Generation Analysis', () => {
  it('should analyze what is generated when household is generated isolated', async () => {
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-household.bpmn',
      ['mortgage-se-household.bpmn'],
      [],
      false, // useHierarchy = false (isolated)
      false, // useLlm = false (templates)
    );

    console.log('\n=== Household Isolated Generation ===');
    console.log(`Total docs: ${result.docs.size}`);

    // Parse BPMN to count expected nodes
    const parseResult = await parseBpmnFile('/bpmn/mortgage-se-household.bpmn');
    const processes = parseResult.meta?.processes || [];
    const callActivities = parseResult.callActivities || [];
    const userTasks = parseResult.userTasks || [];
    const serviceTasks = parseResult.serviceTasks || [];
    const businessRuleTasks = parseResult.businessRuleTasks || [];
    const subProcesses = parseResult.subprocesses || [];

    const processMeta = processes[0];
    const subprocessCandidates = processMeta?.subprocessCandidates || [];
    const embeddedSubProcesses = subprocessCandidates.filter(sp => sp.kind === 'subProcess');

    console.log('\n=== BPMN File Analysis ===');
    console.log(`Processes: ${processes.length}`);
    console.log(`CallActivities: ${callActivities.length}`);
    console.log(`Embedded SubProcesses: ${embeddedSubProcesses.length}`);
    console.log(`UserTasks: ${userTasks.length}`);
    console.log(`ServiceTasks: ${serviceTasks.length}`);
    console.log(`BusinessRuleTasks: ${businessRuleTasks.length}`);

    // Categorize actual results
    const featureGoalKeys = Array.from(result.docs.keys()).filter(key =>
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    const epicKeys = Array.from(result.docs.keys()).filter(key =>
      key.includes('nodes') && !key.includes('feature-goal')
    );
    const combinedDocKeys = Array.from(result.docs.keys()).filter(key =>
      key.endsWith('.html') && !key.includes('feature-goal') && !key.includes('nodes')
    );

    console.log('\n=== Generated Documentation ===');
    console.log(`Feature Goals: ${featureGoalKeys.length}`);
    featureGoalKeys.forEach(key => console.log(`  - ${key}`));
    console.log(`Epics: ${epicKeys.length}`);
    epicKeys.forEach(key => console.log(`  - ${key}`));
    console.log(`Combined docs: ${combinedDocKeys.length}`);
    combinedDocKeys.forEach(key => console.log(`  - ${key}`));

    // Expected counts
    // VIKTIGT: Subprocess-filer genererar INTE Feature Goals längre (ersatta av file-level docs)
    const expectedFeatureGoals = 0; // Subprocess-filer genererar INTE Feature Goals
    const expectedEpics = userTasks.length + serviceTasks.length + businessRuleTasks.length;
    const expectedFileLevelDocs = 1; // Subprocess-filer genererar file-level docs (mortgage-se-household.html)
    const expectedTotal = expectedFeatureGoals + expectedEpics + expectedFileLevelDocs;

    console.log('\n=== Expected vs Actual ===');
    console.log(`Feature Goals: Expected ${expectedFeatureGoals}, Got ${featureGoalKeys.length}`);
    console.log(`Epics: Expected ${expectedEpics}, Got ${epicKeys.length}`);
    console.log(`File-level docs: Expected ${expectedFileLevelDocs}, Got ${combinedDocKeys.length}`);
    console.log(`Total: Expected ${expectedTotal}, Got ${result.docs.size}`);

    // Assertions
    expect(featureGoalKeys.length).toBe(expectedFeatureGoals);
    expect(epicKeys.length).toBe(expectedEpics);
    expect(combinedDocKeys.length).toBe(expectedFileLevelDocs);
    expect(result.docs.size).toBe(expectedTotal);

    console.log('\n✅ Isolated generation analysis complete');
  }, 30000);

  it('should analyze what is generated when household is generated with hierarchy (from application)', async () => {
    // Generate application with hierarchy (includes household)
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      [
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
      ],
      [],
      true, // useHierarchy = true
      false, // useLlm = false (templates)
    );

    console.log('\n=== Household Generation with Hierarchy (from application) ===');
    console.log(`Total docs: ${result.docs.size}`);

    // Filter household-related docs
    const householdFeatureGoals = Array.from(result.docs.keys()).filter(key =>
      key.includes('household') && (key.includes('feature-goal') || key.includes('feature-goals'))
    );
    const householdEpics = Array.from(result.docs.keys()).filter(key =>
      key.includes('household') && key.includes('nodes') && !key.includes('feature-goal')
    );
    const householdCombined = Array.from(result.docs.keys()).filter(key =>
      key.includes('household') && key.endsWith('.html') && !key.includes('feature-goal') && !key.includes('nodes')
    );

    console.log('\n=== Household Documentation in Application Result ===');
    console.log(`Household Feature Goals: ${householdFeatureGoals.length}`);
    householdFeatureGoals.forEach(key => console.log(`  - ${key}`));
    console.log(`Household Epics: ${householdEpics.length}`);
    householdEpics.forEach(key => console.log(`  - ${key}`));
    console.log(`Household Combined docs: ${householdCombined.length}`);
    householdCombined.forEach(key => console.log(`  - ${key}`));

    // Verify household documentation exists
    expect(householdFeatureGoals.length).toBeGreaterThan(0);
    expect(householdEpics.length).toBeGreaterThan(0);
    // Subprocesser genererar INTE combined docs (bara root-processer)
    expect(householdCombined.length).toBe(0);

    console.log('\n✅ Hierarchy generation analysis complete');
  }, 30000);

  it('should count how many times household information is generated in different scenarios', async () => {
    console.log('\n=== Generation Count Analysis ===');

    // Scenario 1: Household isolated
    const isolatedResult = await generateAllFromBpmnWithGraph(
      'mortgage-se-household.bpmn',
      ['mortgage-se-household.bpmn'],
      [],
      false,
      false,
    );

    const isolatedHouseholdDocs = Array.from(isolatedResult.docs.keys()).filter(key =>
      key.includes('household')
    );

    console.log('\n1. Household isolated:');
    console.log(`   Total household docs: ${isolatedHouseholdDocs.length}`);
    isolatedHouseholdDocs.forEach(key => console.log(`     - ${key}`));

    // Scenario 2: Application with hierarchy (includes household)
    const applicationResult = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      [
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
      ],
      [],
      true,
      false,
    );

    const applicationHouseholdDocs = Array.from(applicationResult.docs.keys()).filter(key =>
      key.includes('household')
    );

    console.log('\n2. Application with hierarchy (includes household):');
    console.log(`   Total household docs: ${applicationHouseholdDocs.length}`);
    applicationHouseholdDocs.forEach(key => console.log(`     - ${key}`));

    // Scenario 3: Mortgage with full hierarchy (includes application which includes household)
    const mortgageResult = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      [
        'mortgage.bpmn',
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
      ],
      [],
      true,
      false,
    );

    const mortgageHouseholdDocs = Array.from(mortgageResult.docs.keys()).filter(key =>
      key.includes('household')
    );

    console.log('\n3. Mortgage with full hierarchy (includes application -> household):');
    console.log(`   Total household docs: ${mortgageHouseholdDocs.length}`);
    mortgageHouseholdDocs.forEach(key => console.log(`     - ${key}`));

    // Count unique household doc keys across all scenarios
    const allHouseholdDocKeys = new Set([
      ...isolatedHouseholdDocs,
      ...applicationHouseholdDocs,
      ...mortgageHouseholdDocs,
    ]);

    console.log('\n=== Summary ===');
    console.log(`Unique household doc keys across all scenarios: ${allHouseholdDocKeys.size}`);
    console.log('All unique keys:');
    Array.from(allHouseholdDocKeys).sort().forEach(key => console.log(`  - ${key}`));

    // Analyze: How many times is each type of doc generated?
    const featureGoals = Array.from(allHouseholdDocKeys).filter(key =>
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    const epics = Array.from(allHouseholdDocKeys).filter(key =>
      key.includes('nodes') && !key.includes('feature-goal')
    );
    const combined = Array.from(allHouseholdDocKeys).filter(key =>
      key.endsWith('.html') && !key.includes('feature-goal') && !key.includes('nodes')
    );

    console.log('\n=== Doc Type Counts ===');
    console.log(`Feature Goals: ${featureGoals.length}`);
    console.log(`Epics: ${epics.length}`);
    console.log(`Combined: ${combined.length}`);

    // Key insight: How many times is the same information generated?
    console.log('\n=== Generation Frequency ===');
    console.log('Note: Different keys may contain the same information but in different contexts.');
    console.log('For example:');
    console.log('  - "mortgage-se-household-v2.html" (isolated generation)');
    console.log('  - "mortgage-se-household-application-v2.html" (from application context)');
    console.log('These may have different content based on context, or may reuse the same content.');

    expect(allHouseholdDocKeys.size).toBeGreaterThan(0);
    expect(featureGoals.length).toBeGreaterThan(0);
    expect(epics.length).toBeGreaterThan(0);
    // Subprocesses don't get combined docs (only root processes)
    expect(combined.length).toBe(0);

    console.log('\n✅ Generation count analysis complete');
  }, 90000);
});
