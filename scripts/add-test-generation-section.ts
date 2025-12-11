#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Add Testgenerering section to v2 Feature Goal HTML files
 * 
 * This script:
 * 1. Reads all HTML files from public/local-content/feature-goals/
 * 2. Extracts information from existing content
 * 3. Generates test generation section with auto-generated content
 * 4. Adds the section before </div></body></html>
 * 
 * Usage:
 *   tsx scripts/add-test-generation-section.ts [--dry-run] [--file filename.html]
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FEATURE_GOALS_DIR = resolve(__dirname, '../public/local-content/feature-goals');

interface ExtractedInfo {
  title: string;
  activities: Array<{
    name: string;
    type: 'user-task' | 'service-task' | 'business-rule-task' | 'call-activity';
    description: string;
    lane?: 'stakeholder' | 'compliance' | 'system';
  }>;
  outputs: string[];
  processType: 'kyc' | 'application' | 'credit' | 'other';
  inputs: string[];
}

/**
 * Extract information from HTML content
 */
function extractInfo(html: string): ExtractedInfo {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Feature Goal';

  // Extract activities from "Omfattning" section
  const omfattningMatch = html.match(/<h2>Omfattning<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
  const activities: ExtractedInfo['activities'] = [];
  
  if (omfattningMatch) {
    const omfattningContent = omfattningMatch[1];
    // Match <li><strong>Name:</strong>Description</li> pattern
    const activityMatches = omfattningContent.matchAll(/<li><strong>([^<]+):<\/strong>([^<]*(?:<ul>[\s\S]*?<\/ul>)?[^<]*)<\/li>/gi);
    
    for (const match of activityMatches) {
      const name = match[1].trim();
      let description = match[2].trim();
      // Remove nested <ul> tags but keep their content
      description = description.replace(/<ul>[\s\S]*?<\/ul>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Skip "Felhantering" as it's not an activity
      if (name.toLowerCase().includes('felhantering') || name.toLowerCase().includes('error handling')) {
        continue;
      }
      
      // Determine type and lane
      let type: ExtractedInfo['activities'][0]['type'] = 'call-activity';
      let lane: ExtractedInfo['activities'][0]['lane'] | undefined;
      
      const descLower = description.toLowerCase();
      
      if (descLower.includes('user task') || descLower.includes('user-task')) {
        type = 'user-task';
        if (descLower.includes('stakeholder lane') || descLower.includes('stakeholder')) {
          lane = 'stakeholder';
        } else if (descLower.includes('compliance lane') || descLower.includes('compliance')) {
          lane = 'compliance';
        }
      } else if (descLower.includes('service task') || descLower.includes('service-task')) {
        type = 'service-task';
        if (descLower.includes('system lane') || descLower.includes('system')) {
          lane = 'system';
        }
      } else if (descLower.includes('business rule task') || descLower.includes('business rule') || descLower.includes('business-rule')) {
        type = 'business-rule-task';
        if (descLower.includes('system lane') || descLower.includes('system')) {
          lane = 'system';
        }
      } else if (descLower.includes('call activity') || descLower.includes('subprocess') || descLower.includes('call-activity')) {
        type = 'call-activity';
      }
      
      // Also check name for clues about user tasks
      const nameLower = name.toLowerCase();
      
      // If description mentions "user task" or "kund" or "customer", it's likely a user task
      if (descLower.includes('user task') || descLower.includes('kund') || descLower.includes('customer') || descLower.includes('bekräft')) {
        if (type === 'call-activity') {
          type = 'user-task';
          if (descLower.includes('kund') || descLower.includes('customer') || descLower.includes('stakeholder')) {
            lane = 'stakeholder';
          }
        }
      }
      
      // Common user task patterns
      if (nameLower.includes('confirm') || nameLower.includes('submit') || nameLower.includes('review') || nameLower.includes('fill')) {
        if (type === 'call-activity' && !descLower.includes('subprocess')) {
          type = 'user-task';
          lane = 'stakeholder';
        }
      }
      
      activities.push({ name, type, description, lane });
    }
  }

  // Extract outputs from "Processteg - Output" section
  const outputMatch = html.match(/<h2>Processteg - Output<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
  const outputs: string[] = [];
  
  if (outputMatch) {
    const outputContent = outputMatch[1];
    const outputMatches = outputContent.matchAll(/<li>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>)*[^<]*)<\/li>/gi);
    for (const match of outputMatches) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text && !text.toLowerCase().includes('vid fel:')) {
        outputs.push(text);
      }
    }
  }

  // Extract inputs from "Processteg - Input" section
  const inputMatch = html.match(/<h2>Processteg - Input<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
  const inputs: string[] = [];
  
  if (inputMatch) {
    const inputContent = inputMatch[1];
    const inputMatches = inputContent.matchAll(/<li>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>)*[^<]*)<\/li>/gi);
    for (const match of inputMatches) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text) {
        inputs.push(text);
      }
    }
  }

  // Determine process type from title and description
  let processType: ExtractedInfo['processType'] = 'other';
  const titleLower = title.toLowerCase();
  const descriptionMatch = html.match(/<h2>Beskrivning av FGoal<\/h2>[\s\S]*?<p>([^<]+)<\/p>/i);
  const description = descriptionMatch ? descriptionMatch[1].toLowerCase() : '';
  
  if (titleLower.includes('kyc') || description.includes('kyc') || description.includes('compliance')) {
    processType = 'kyc';
  } else if (titleLower.includes('application') || description.includes('ansökan')) {
    processType = 'application';
  } else if (titleLower.includes('credit') || description.includes('kredit')) {
    processType = 'credit';
  }

  return { title, activities, outputs, processType, inputs };
}

/**
 * Generate test scenarios from extracted information
 */
function generateTestScenarios(info: ExtractedInfo): Array<{
  id: string;
  name: string;
  type: 'Happy' | 'Edge' | 'Error';
  persona: 'customer' | 'advisor' | 'system' | 'unknown';
  riskLevel: 'P0' | 'P1' | 'P2';
  assertionType: 'functional' | 'regression' | 'compliance' | 'other';
  outcome: string;
  status: string;
}> {
  const scenarios: ReturnType<typeof generateTestScenarios> = [];
  let scenarioIndex = 1;

  // Generate Happy path scenario from first positive output
  if (info.outputs.length > 0) {
    const happyOutput = info.outputs[0];
    // Find persona from activities
    let persona: 'customer' | 'advisor' | 'system' | 'unknown' = 'unknown';
    const userTaskStakeholder = info.activities.find(a => a.type === 'user-task' && a.lane === 'stakeholder');
    const userTaskCompliance = info.activities.find(a => a.type === 'user-task' && a.lane === 'compliance');
    const anyUserTask = info.activities.find(a => a.type === 'user-task');
    
    if (userTaskStakeholder) {
      persona = 'customer';
    } else if (userTaskCompliance) {
      persona = 'advisor';
    } else if (anyUserTask) {
      // Check description for clues
      const taskDesc = anyUserTask.description.toLowerCase();
      if (taskDesc.includes('kund') || taskDesc.includes('customer') || taskDesc.includes('stakeholder')) {
        persona = 'customer';
      } else if (taskDesc.includes('compliance') || taskDesc.includes('handläggare') || taskDesc.includes('advisor')) {
        persona = 'advisor';
      } else {
        persona = 'customer'; // Default for user tasks
      }
    } else if (info.activities.some(a => a.type === 'service-task' || a.type === 'business-rule-task')) {
      persona = 'system';
    }
    
    // Create a better scenario name
    let scenarioName = 'Normalflöde – komplett process';
    if (happyOutput.toLowerCase().includes('bekräft')) {
      scenarioName = 'Normalflöde – bekräftad';
    } else if (happyOutput.toLowerCase().includes('insamlad') || happyOutput.toLowerCase().includes('validerad')) {
      scenarioName = 'Normalflöde – data insamlad och validerad';
    } else if (happyOutput.toLowerCase().includes('godkänd') || happyOutput.toLowerCase().includes('approved')) {
      scenarioName = 'Normalflöde – godkänd';
    }
    
    scenarios.push({
      id: `S${scenarioIndex++}`,
      name: scenarioName,
      type: 'Happy',
      persona,
      riskLevel: 'P1',
      assertionType: info.processType === 'kyc' ? 'compliance' : 'functional',
      outcome: happyOutput,
      status: '✅ Planerad',
    });
  }

  // Generate Error scenarios from error mentions in outputs
  const errorOutputs = info.outputs.filter(o => 
    o.toLowerCase().includes('rejected') || 
    o.toLowerCase().includes('avvisas') || 
    o.toLowerCase().includes('fel') ||
    o.toLowerCase().includes('error')
  );
  
  for (const errorOutput of errorOutputs.slice(0, 2)) {
    scenarios.push({
      id: `S${scenarioIndex++}`,
      name: errorOutput.length > 50 ? errorOutput.substring(0, 47) + '...' : errorOutput,
      type: 'Error',
      persona: 'system',
      riskLevel: 'P0',
      assertionType: info.processType === 'kyc' ? 'compliance' : 'functional',
      outcome: errorOutput,
      status: '✅ Planerad',
    });
  }

  // Generate Edge scenario if we have mentions of manual review or incomplete data
  const edgeOutputs = info.outputs.filter(o =>
    o.toLowerCase().includes('manuell') ||
    o.toLowerCase().includes('granskning') ||
    o.toLowerCase().includes('komplettering') ||
    o.toLowerCase().includes('incomplete')
  );
  
  if (edgeOutputs.length > 0) {
    scenarios.push({
      id: `S${scenarioIndex++}`,
      name: edgeOutputs[0].length > 50 ? edgeOutputs[0].substring(0, 47) + '...' : edgeOutputs[0],
      type: 'Edge',
      persona: info.activities.find(a => a.type === 'user-task') ? 'customer' : 'unknown',
      riskLevel: 'P2',
      assertionType: 'functional',
      outcome: edgeOutputs[0],
      status: '⏳ TODO',
    });
  } else if (scenarios.length < 3) {
    // Add a default edge case if we don't have enough scenarios
    scenarios.push({
      id: `S${scenarioIndex++}`,
      name: 'Ofullständig information eller komplettering behövs',
      type: 'Edge',
      persona: 'customer',
      riskLevel: 'P2',
      assertionType: 'functional',
      outcome: 'Kunden styrs till komplettering, beslut skjuts upp',
      status: '⏳ TODO',
    });
  }

  return scenarios;
}

/**
 * Generate UI Flow steps for a scenario
 */
function generateUiFlowSteps(
  scenario: ReturnType<typeof generateTestScenarios>[0],
  info: ExtractedInfo
): Array<{
  step: number;
  pageId: string;
  action: string;
  locatorId: string;
  dataProfile: string;
  comment: string;
}> {
  const steps: ReturnType<typeof generateUiFlowSteps> = [];
  let stepNum = 1;

  // Find user tasks for UI flow
  const userTasks = info.activities.filter(a => a.type === 'user-task');
  
  if (userTasks.length > 0) {
    // Prefer "Confirm" or "Submit" tasks as they're typically the main user interaction
    const confirmTask = userTasks.find(t => t.name.toLowerCase().includes('confirm') || t.name.toLowerCase().includes('submit'));
    const firstTask = confirmTask || userTasks[0];
    const pageId = firstTask.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Use a better page ID if it's a common pattern
    let finalPageId = pageId;
    if (firstTask.name.toLowerCase().includes('confirm')) {
      finalPageId = 'confirm-application';
    } else if (firstTask.name.toLowerCase().includes('submit')) {
      finalPageId = 'submit-form';
    } else if (firstTask.name.toLowerCase().includes('review')) {
      finalPageId = 'review-page';
    }
    
    steps.push({
      step: stepNum++,
      pageId: finalPageId,
      action: 'navigate',
      locatorId: '-',
      dataProfile: '-',
      comment: `Navigera till ${firstTask.name.toLowerCase()}`,
    });

    // Add steps for filling/clicking based on scenario type
    if (scenario.type === 'Happy') {
      // Add fill steps for each user task if multiple
      if (userTasks.length > 1) {
        for (let i = 0; i < Math.min(userTasks.length, 3); i++) {
          const task = userTasks[i];
          const taskPageId = task.name.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          
          steps.push({
            step: stepNum++,
            pageId: taskPageId,
            action: 'fill',
            locatorId: `[TODO: Lägg till locator för ${task.name.toLowerCase()}]`,
            dataProfile: '[TODO: Definiera testdata]',
            comment: `Fyll i information för ${task.name.toLowerCase()}`,
          });
        }
      } else {
        steps.push({
          step: stepNum++,
          pageId,
          action: 'fill',
          locatorId: '[TODO: Lägg till locator för första fältet]',
          dataProfile: '[TODO: Definiera testdata]',
          comment: `Fyll i information för ${firstTask.name.toLowerCase()}`,
        });
      }
      
      steps.push({
        step: stepNum++,
        pageId,
        action: 'click',
        locatorId: '[TODO: Lägg till locator för submit-knapp]',
        dataProfile: '-',
        comment: 'Skicka/Submit',
      });
      
      steps.push({
        step: stepNum++,
        pageId: `${pageId}-confirmation`,
        action: 'verify',
        locatorId: '[TODO: Lägg till locator för bekräftelsemeddelande]',
        dataProfile: '-',
        comment: 'Verifiera bekräftelse',
      });
    } else if (scenario.type === 'Error') {
      steps.push({
        step: stepNum++,
        pageId,
        action: 'fill',
        locatorId: '[TODO: Lägg till locator för fält]',
        dataProfile: '[TODO: Definiera testdata som orsakar fel]',
        comment: 'Fyll i information som orsakar fel',
      });
      
      steps.push({
        step: stepNum++,
        pageId,
        action: 'click',
        locatorId: '[TODO: Lägg till locator för submit-knapp]',
        dataProfile: '-',
        comment: 'Försök skicka med felaktig information',
      });
      
      steps.push({
        step: stepNum++,
        pageId,
        action: 'verify',
        locatorId: '[TODO: Lägg till locator för felmeddelande]',
        dataProfile: '-',
        comment: 'Verifiera att felmeddelande visas',
      });
    } else if (scenario.type === 'Edge') {
      steps.push({
        step: stepNum++,
        pageId,
        action: 'fill',
        locatorId: '[TODO: Lägg till locator för fält]',
        dataProfile: '[TODO: Definiera testdata för edge case]',
        comment: 'Fyll i information som kräver komplettering',
      });
      
      steps.push({
        step: stepNum++,
        pageId,
        action: 'click',
        locatorId: '[TODO: Lägg till locator för submit-knapp]',
        dataProfile: '-',
        comment: 'Skicka med ofullständig information',
      });
      
      steps.push({
        step: stepNum++,
        pageId: `${pageId}-completion`,
        action: 'verify',
        locatorId: '[TODO: Lägg till locator för kompletteringsmeddelande]',
        dataProfile: '-',
        comment: 'Verifiera att kompletteringsmeddelande visas',
      });
    }
  } else {
    // No user tasks, add placeholder steps
    steps.push({
      step: stepNum++,
      pageId: '[TODO: Lägg till page ID]',
      action: 'navigate',
      locatorId: '-',
      dataProfile: '-',
      comment: '[TODO: Lägg till navigationssteg]',
    });
  }

  return steps;
}

/**
 * Generate test data references
 */
function generateTestDataReferences(info: ExtractedInfo): Array<{ id: string; description: string }> {
  const dataRefs: ReturnType<typeof generateTestDataReferences> = [];
  
  // Extract data types from inputs
  if (info.inputs.some(i => i.toLowerCase().includes('inkomst') || i.toLowerCase().includes('income'))) {
    dataRefs.push({
      id: 'customer-high-income',
      description: '[TODO: Definiera testdata för kund med hög inkomst (>600k SEK/år), låg skuldsättning (<30%), god kredithistorik]',
    });
    dataRefs.push({
      id: 'customer-low-income',
      description: '[TODO: Definiera testdata för kund med låg inkomst (<300k SEK/år), hög skuldsättning (>50%)]',
    });
  }
  
  if (info.inputs.some(i => i.toLowerCase().includes('hushåll') || i.toLowerCase().includes('household'))) {
    dataRefs.push({
      id: 'customer-standard-household',
      description: '[TODO: Definiera testdata för standard hushåll (2 vuxna, 2 barn), medianinkomst (~400k SEK/år)]',
    });
  }
  
  if (info.inputs.some(i => i.toLowerCase().includes('stakeholder') || i.toLowerCase().includes('part'))) {
    dataRefs.push({
      id: 'stakeholder-primary',
      description: '[TODO: Definiera testdata för primär sökande med fullständig information]',
    });
  }

  // Add default if none found
  if (dataRefs.length === 0) {
    dataRefs.push({
      id: '[TODO: data-profile-id]',
      description: '[TODO: Definiera testdata för denna process]',
    });
  }

  return dataRefs;
}

/**
 * Generate implementation mapping
 */
function generateImplementationMapping(info: ExtractedInfo): Array<{
  activity: string;
  type: 'UI' | 'API' | 'Both';
  route: string;
  method: string;
  baseUrl: string;
  comment: string;
}> {
  const mappings: ReturnType<typeof generateImplementationMapping> = [];
  
  for (const activity of info.activities) {
    let type: 'UI' | 'API' | 'Both' = 'UI';
    let method = '-';
    
    if (activity.type === 'service-task' || activity.type === 'business-rule-task') {
      type = 'API';
      method = '[TODO: Lägg till HTTP method, t.ex. GET eller POST]';
    } else if (activity.type === 'call-activity') {
      type = 'Both';
    }
    
    const route = activity.type === 'user-task' || activity.type === 'call-activity'
      ? `[TODO: Lägg till route, t.ex. /${activity.name.toLowerCase().replace(/\s+/g, '-')}]`
      : `[TODO: Lägg till endpoint, t.ex. /api/v1/${activity.name.toLowerCase().replace(/\s+/g, '-')}]`;
    
    mappings.push({
      activity: activity.name,
      type,
      route,
      method,
      baseUrl: '[TODO: Lägg till base URL för miljön]',
      comment: activity.description.length > 80 ? activity.description.substring(0, 77) + '...' : activity.description,
    });
  }

  return mappings;
}

/**
 * Generate test generation section HTML
 */
function generateTestGenerationSection(info: ExtractedInfo): string {
  const scenarios = generateTestScenarios(info);
  const testDataRefs = generateTestDataReferences(info);
  const implMapping = generateImplementationMapping(info);

  // Generate scenarios table
  const scenariosTableRows = scenarios.map(s => `
      <tr>
        <td><strong>${s.id}</strong></td>
        <td>${s.name}</td>
        <td>${s.type}</td>
        <td>${s.persona}</td>
        <td>${s.riskLevel}</td>
        <td>${s.assertionType}</td>
        <td>${s.outcome}</td>
        <td>${s.status}</td>
      </tr>
    `).join('');

  // Generate UI Flow sections for each scenario
  const uiFlowSections = scenarios.map(scenario => {
    const steps = generateUiFlowSteps(scenario, info);
    const stepsRows = steps.map(step => `
        <tr>
          <td>${step.step}</td>
          <td>${step.pageId}</td>
          <td>${step.action}</td>
          <td>${step.locatorId}</td>
          <td>${step.dataProfile}</td>
          <td>${step.comment}</td>
        </tr>
      `).join('');
    
    return `
      <details style="margin: 12px 0; padding: 12px; border: 1px solid var(--border); border-radius: 6px;">
        <summary style="cursor: pointer; font-weight: 600; color: var(--primary);">
          <strong>${scenario.id}: ${scenario.name}</strong> (Klicka för att expandera)
        </summary>
        <table style="margin-top: 12px;">
          <thead>
            <tr>
              <th>Steg</th>
              <th>Page ID</th>
              <th>Action</th>
              <th>Locator ID</th>
              <th>Data Profile</th>
              <th>Kommentar</th>
            </tr>
          </thead>
          <tbody>
            ${stepsRows}
          </tbody>
        </table>
      </details>
    `;
  }).join('');

  // Generate test data references list
  const testDataList = testDataRefs.map(ref => `
      <li><strong>${ref.id}</strong>: ${ref.description}</li>
    `).join('');

  // Generate implementation mapping table
  const implMappingRows = implMapping.map(m => `
      <tr>
        <td>${m.activity}</td>
        <td>${m.type}</td>
        <td>${m.route}</td>
        <td>${m.method}</td>
        <td>${m.baseUrl}</td>
        <td>${m.comment}</td>
      </tr>
    `).join('');

  return `
    <section class="doc-section">
      <h2>Testgenerering</h2>
      <p class="muted">Information för att generera automatiserade tester. Delar kan auto-genereras från processbeskrivningen, men kompletteras manuellt med implementation-specifik information (routes, locators, testdata).</p>

      <h3>Testscenarier</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Namn</th>
            <th>Typ</th>
            <th>Persona</th>
            <th>Risk Level</th>
            <th>Assertion Type</th>
            <th>Outcome</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${scenariosTableRows}
        </tbody>
      </table>

      <h3>UI Flow per Scenario</h3>
      <p class="muted">Detaljerade steg för varje scenario. Expandera för att se UI Flow.</p>
      ${uiFlowSections}

      <h3>Testdata-referenser</h3>
      <p class="muted">Testdata-profilerna som används i scenarion. Definiera faktiska testdata i separat testdata-katalog.</p>
      <ul>
        ${testDataList}
      </ul>

      <h3>Implementation Mapping</h3>
      <p class="muted">Mappning mellan BPMN-aktiviteter och faktisk implementation (routes, endpoints, locators).</p>
      <table>
        <thead>
          <tr>
            <th>BPMN Aktivitet</th>
            <th>Type</th>
            <th>Route/Endpoint</th>
            <th>Method</th>
            <th>Base URL</th>
            <th>Kommentar</th>
          </tr>
        </thead>
        <tbody>
          ${implMappingRows}
        </tbody>
      </table>
    </section>
  `;
}

/**
 * Add test generation section to HTML file
 */
function addTestGenerationSection(filePath: string, dryRun: boolean = false): void {
  try {
    const html = readFileSync(filePath, 'utf-8');
    
    // Check if section already exists
    if (html.includes('<h2>Testgenerering</h2>')) {
      console.log(`⏭️  Skipping ${filePath} - Testgenerering section already exists`);
      return;
    }

    // Extract information
    const info = extractInfo(html);
    
    // Generate section
    const testSection = generateTestGenerationSection(info);
    
    // Insert before </div></body></html>
    const insertPattern = /(\s*)<\/div>\s*<\/body>\s*<\/html>/i;
    if (!insertPattern.test(html)) {
      console.error(`❌ Could not find insertion point in ${filePath}`);
      return;
    }
    
    const newHtml = html.replace(insertPattern, `\n${testSection}\n$1</div>\n  </body>\n</html>`);
    
    if (dryRun) {
      console.log(`[DRY RUN] Would update ${filePath}`);
      console.log(`  - Extracted ${info.activities.length} activities`);
      console.log(`  - Generated ${generateTestScenarios(info).length} scenarios`);
    } else {
      // ⚠️ SKYDD: Kontrollera om filen redan har manuellt förbättrat innehåll
      // (identifierat genom att den har "Lokal version" badge)
      const hasLocalBadge = html.includes('Lokal version') || html.includes('local-version-badge');
      
      if (hasLocalBadge && !process.argv.includes('--force')) {
        console.log(`⚠️  SKIPPAR ${filename} - Filen har manuellt förbättrat innehåll (har "Lokal version" badge)`);
        console.log(`   Använd --force för att skriva över ändå (rekommenderas INTE)`);
        continue;
      }
      
      writeFileSync(filePath, newHtml, 'utf-8');
      console.log(`✅ Updated ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find(arg => arg.startsWith('--file='));
  const specificFile = fileArg ? fileArg.split('=')[1] : null;

  console.log('🚀 Adding Testgenerering section to v2 Feature Goal files...\n');

  if (!existsSync(FEATURE_GOALS_DIR)) {
    console.error(`❌ Directory not found: ${FEATURE_GOALS_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(FEATURE_GOALS_DIR)
    .filter(f => f.endsWith('-v2.html'))
    .sort();

  if (specificFile) {
    const filePath = join(FEATURE_GOALS_DIR, specificFile);
    if (existsSync(filePath)) {
      addTestGenerationSection(filePath, dryRun);
    } else {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
  } else {
    console.log(`📋 Found ${files.length} v2 HTML file(s)\n`);
    
    let successCount = 0;
    let skippedCount = 0;
    
    for (const file of files) {
      const filePath = join(FEATURE_GOALS_DIR, file);
      const html = readFileSync(filePath, 'utf-8');
      if (html.includes('<h2>Testgenerering</h2>')) {
        skippedCount++;
        console.log(`⏭️  Skipping ${file} - Testgenerering section already exists`);
      } else {
        addTestGenerationSection(filePath, dryRun);
        successCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    if (!dryRun) {
      console.log(`   ✅ Successfully updated: ${successCount} file(s)`);
      console.log(`   ⏭️  Skipped (already exists): ${skippedCount} file(s)`);
    } else {
      console.log(`   [DRY RUN] Would update: ${files.length} file(s)`);
    }
    console.log('='.repeat(60));
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

