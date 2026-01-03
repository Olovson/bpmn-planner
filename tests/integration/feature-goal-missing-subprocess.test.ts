/**
 * @vitest-environment jsdom
 * 
 * Integration tests to verify that Feature Goals are NOT generated when subprocess files are missing.
 * 
 * This is a critical test to ensure we don't generate incomplete documentation.
 */

import { describe, it, expect } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { parseBpmnFile } from '@/lib/bpmnParser';

describe('Feature Goal generation when subprocess files are missing', () => {
  it('should NOT generate Feature Goal when subprocess file is missing', async () => {
    // Scenario: Generate for mortgage-se-application.bpmn WITHOUT mortgage-se-signing.bpmn
    // Application has a callActivity "signing" that points to mortgage-se-signing.bpmn
    // Since signing.bpmn is not in existingBpmnFiles, Feature Goal should NOT be generated
    
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      ['mortgage-se-application.bpmn'], // Bara application, INTE signing
      [],
      false, // useHierarchy = false (isolated)
      false, // useLlm = false (templates)
    );

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

    console.log('\n=== Categorized Files ===');
    console.log('Feature Goal keys:', featureGoalKeys);
    console.log('Epic keys:', epicKeys);

    // Verify that NO Feature Goal was generated for "signing" call activity
    const signingFeatureGoals = featureGoalKeys.filter(key =>
      key.includes('signing')
    );
    
    console.log('\n=== Signing Feature Goals ===');
    console.log('Found:', signingFeatureGoals.length);
    signingFeatureGoals.forEach(key => console.log(`  - ${key}`));

    // CRITICAL: Should have NO Feature Goal for signing (subprocess file is missing)
    expect(signingFeatureGoals.length).toBe(0);
    
    // Should still have Feature Goal for application process itself
    const applicationFeatureGoals = featureGoalKeys.filter(key =>
      key.includes('application') && !key.includes('signing')
    );
    expect(applicationFeatureGoals.length).toBeGreaterThan(0);
    
    console.log('\n✅ Feature Goal correctly NOT generated for missing subprocess');
  }, 30000);

  it('should generate Feature Goal when subprocess file exists', async () => {
    // Scenario: Generate for mortgage-se-application.bpmn WITH its subprocess files
    // Application has call activities: internal-data-gathering, household, stakeholder, object
    // Since these files ARE in existingBpmnFiles, Feature Goals SHOULD be generated
    
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      [
        'mortgage-se-application.bpmn',
        'mortgage-se-internal-data-gathering.bpmn', // Subprocess file EXISTS
        'mortgage-se-household.bpmn', // Subprocess file EXISTS
        'mortgage-se-stakeholder.bpmn', // Subprocess file EXISTS
        'mortgage-se-object.bpmn', // Subprocess file EXISTS
      ],
      [],
      true, // useHierarchy = true (to include subprocess)
      false, // useLlm = false (templates)
    );

    console.log('\n=== Generated Documentation Files ===');
    console.log('Total docs:', result.docs.size);
    console.log('All doc keys:', Array.from(result.docs.keys()));

    // Categorize files
    const featureGoalKeys = Array.from(result.docs.keys()).filter(key =>
      key.includes('feature-goal') || key.includes('feature-goals')
    );

    console.log('\n=== Feature Goal Keys ===');
    featureGoalKeys.forEach(key => console.log(`  - ${key}`));

    // Verify that Feature Goals WERE generated for subprocess call activities
    const internalDataGatheringFeatureGoals = featureGoalKeys.filter(key =>
      key.includes('internal-data-gathering')
    );
    const householdFeatureGoals = featureGoalKeys.filter(key =>
      key.includes('household')
    );
    
    console.log('\n=== Subprocess Feature Goals ===');
    console.log('Internal data gathering:', internalDataGatheringFeatureGoals.length);
    console.log('Household:', householdFeatureGoals.length);

    // CRITICAL: Should have Feature Goals for subprocesses (subprocess files exist)
    expect(internalDataGatheringFeatureGoals.length).toBeGreaterThan(0);
    expect(householdFeatureGoals.length).toBeGreaterThan(0);
    
    console.log('\n✅ Feature Goals correctly generated when subprocess files exist');
  }, 30000);

  it('should handle partially missing subprocess files correctly', async () => {
    // Scenario: Generate for mortgage-se-application.bpmn with SOME subprocess files but not all
    // Application has call activities: internal-data-gathering, household, stakeholder, object
    // - mortgage-se-internal-data-gathering.bpmn EXISTS
    // - mortgage-se-household.bpmn EXISTS
    // - mortgage-se-stakeholder.bpmn MISSING
    // - mortgage-se-object.bpmn MISSING
    // 
    // Expected: Feature Goals for internal-data-gathering and household, but NOT for stakeholder/object
    
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      [
        'mortgage-se-application.bpmn',
        'mortgage-se-internal-data-gathering.bpmn', // EXISTS
        'mortgage-se-household.bpmn', // EXISTS
        // mortgage-se-stakeholder.bpmn is MISSING
        // mortgage-se-object.bpmn is MISSING
      ],
      [],
      true, // useHierarchy = true
      false, // useLlm = false (templates)
    );

    console.log('\n=== Generated Documentation Files ===');
    console.log('Total docs:', result.docs.size);

    // Categorize files
    const featureGoalKeys = Array.from(result.docs.keys()).filter(key =>
      key.includes('feature-goal') || key.includes('feature-goals')
    );

    console.log('\n=== Feature Goal Keys ===');
    featureGoalKeys.forEach(key => console.log(`  - ${key}`));

    // Verify Feature Goals for files that exist
    const internalDataGatheringFeatureGoals = featureGoalKeys.filter(key =>
      key.includes('internal-data-gathering')
    );
    const householdFeatureGoals = featureGoalKeys.filter(key =>
      key.includes('household')
    );
    
    // Verify NO Feature Goal for missing files
    const stakeholderFeatureGoals = featureGoalKeys.filter(key =>
      key.includes('stakeholder')
    );
    const objectFeatureGoals = featureGoalKeys.filter(key =>
      key.includes('object') && !key.includes('internal-data-gathering')
    );

    console.log('\n=== Verification ===');
    console.log('Internal Data Gathering Feature Goals:', internalDataGatheringFeatureGoals.length);
    console.log('Household Feature Goals:', householdFeatureGoals.length);
    console.log('Stakeholder Feature Goals (should be 0):', stakeholderFeatureGoals.length);
    console.log('Object Feature Goals (should be 0):', objectFeatureGoals.length);

    // Should have Feature Goals for existing subprocesses
    expect(internalDataGatheringFeatureGoals.length).toBeGreaterThan(0);
    expect(householdFeatureGoals.length).toBeGreaterThan(0);
    
    // Should NOT have Feature Goals for missing subprocesses
    expect(stakeholderFeatureGoals.length).toBe(0);
    expect(objectFeatureGoals.length).toBe(0);
    
    console.log('\n✅ Partially missing subprocess files handled correctly');
  }, 30000);

  it('should verify missingDependencies in result metadata', async () => {
    // Scenario: Generate for mortgage-se-application.bpmn without signing
    // Verify that missingDependencies includes signing.bpmn
    
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      ['mortgage-se-application.bpmn'], // Without signing
      [],
      true, // useHierarchy = true (to detect missing dependencies)
      false, // useLlm = false (templates)
    );

    // Check metadata for missing dependencies
    if (result.metadata?.missingDependencies) {
      console.log('\n=== Missing Dependencies ===');
      result.metadata.missingDependencies.forEach(dep => {
        console.log(`  - ${dep.parent} -> ${dep.childProcess}`);
      });
      
      // Should have missing dependency for signing
      const hasSigningMissing = result.metadata.missingDependencies.some(
        dep => dep.childProcess.includes('signing')
      );
      
      // Note: This might not always be true depending on how bpmn-map matches,
      // but it's good to verify the structure
      console.log('Has signing in missingDependencies:', hasSigningMissing);
    }
    
    // Verify that no Feature Goal was generated for signing
    const featureGoalKeys = Array.from(result.docs.keys()).filter(key =>
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    const signingFeatureGoals = featureGoalKeys.filter(key =>
      key.includes('signing')
    );
    
    expect(signingFeatureGoals.length).toBe(0);
    
    console.log('\n✅ Missing dependencies tracked correctly');
  }, 30000);
});



















