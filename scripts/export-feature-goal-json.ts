#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * CLI script to export Feature Goal documentation to JSON
 * 
 * Usage:
 *   tsx scripts/export-feature-goal-json.ts <bpmnFile> <elementId> [outputDir] [templateVersion]
 * 
 * Example:
 *   tsx scripts/export-feature-goal-json.ts mortgage-se-application.bpmn application
 *   tsx scripts/export-feature-goal-json.ts mortgage-se-application.bpmn application exports/feature-goals v2
 */

// Import with dynamic import to avoid path-intersection issues
async function runExport() {
  const { exportFeatureGoalToJson } = await import('../src/lib/featureGoalJsonExport');
  return exportFeatureGoalToJson;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: tsx scripts/export-feature-goal-json.ts <bpmnFile> <elementId> [outputDir] [templateVersion]');
    console.error('');
    console.error('Example:');
    console.error('  tsx scripts/export-feature-goal-json.ts mortgage-se-application.bpmn application');
    console.error('  tsx scripts/export-feature-goal-json.ts mortgage-se-application.bpmn application exports/feature-goals v2');
    process.exit(1);
  }

  const bpmnFile = args[0];
  const elementId = args[1];
  const outputDir = args[2] || 'exports/feature-goals';
  const templateVersion = (args[3] as 'v1' | 'v2') || 'v2';

  console.log('🚀 Exporting Feature Goal to JSON...\n');
  console.log(`   BPMN File: ${bpmnFile}`);
  console.log(`   Element ID: ${elementId}`);
  console.log(`   Output Dir: ${outputDir}`);
  console.log(`   Template Version: ${templateVersion}\n`);

  try {
    const exportFn = await runExport();
    const filePath = await exportFn(
      bpmnFile,
      elementId,
      outputDir,
      templateVersion
    );

    console.log('✅ Export successful!');
    console.log(`   File: ${filePath}\n`);
    console.log('📝 Next steps:');
    console.log('   1. Edit the JSON file manually');
    console.log('   2. Run: npm run import:feature-goal:json -- <filePath>');
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

