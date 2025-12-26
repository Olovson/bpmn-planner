#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Debug script to see what nodes are being counted for a specific file
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugNodeCount(fileName: string): Promise<void> {
  console.log(`\n🔍 Debug Node Count for: ${fileName}\n`);
  console.log('═'.repeat(80));
  
  // This would require importing buildBpmnProcessGraph which has path-intersection issues
  // Instead, let's parse the BPMN file directly to count nodes
  
  try {
    const { data: fileData, error } = await supabase.storage
      .from('bpmn-files')
      .download(fileName);
    
    if (error || !fileData) {
      console.error(`Failed to load BPMN file: ${error?.message}`);
      return;
    }
    
    const xmlText = await fileData.text();
    
    // Count userTask, serviceTask, businessRuleTask, callActivity
    const userTaskRegex = /<bpmn:userTask[^>]*id="([^"]+)"[^>]*>/gi;
    const serviceTaskRegex = /<bpmn:serviceTask[^>]*id="([^"]+)"[^>]*>/gi;
    const businessRuleTaskRegex = /<bpmn:businessRuleTask[^>]*id="([^"]+)"[^>]*>/gi;
    const callActivityRegex = /<bpmn:callActivity[^>]*id="([^"]+)"[^>]*>/gi;
    
    const userTasks = Array.from(xmlText.matchAll(userTaskRegex));
    const serviceTasks = Array.from(xmlText.matchAll(serviceTaskRegex));
    const businessRuleTasks = Array.from(xmlText.matchAll(businessRuleTaskRegex));
    const callActivities = Array.from(xmlText.matchAll(callActivityRegex));
    
    const total = userTasks.length + serviceTasks.length + businessRuleTasks.length + callActivities.length;
    
    console.log(`📊 Nodes in ${fileName}:`);
    console.log(`   - UserTasks: ${userTasks.length}`);
    console.log(`   - ServiceTasks: ${serviceTasks.length}`);
    console.log(`   - BusinessRuleTasks: ${businessRuleTasks.length}`);
    console.log(`   - CallActivities: ${callActivities.length}`);
    console.log(`   - Total: ${total}`);
    
    if (userTasks.length > 0) {
      console.log(`\n   UserTasks:`);
      userTasks.forEach(match => {
        const id = match[1];
        const nameMatch = xmlText.match(new RegExp(`<bpmn:userTask[^>]*id="${id}"[^>]*name="([^"]+)"`, 'i'));
        const name = nameMatch ? nameMatch[1] : id;
        console.log(`     - ${id} (${name})`);
      });
    }
    
    if (serviceTasks.length > 0) {
      console.log(`\n   ServiceTasks:`);
      serviceTasks.forEach(match => {
        const id = match[1];
        const nameMatch = xmlText.match(new RegExp(`<bpmn:serviceTask[^>]*id="${id}"[^>]*name="([^"]+)"`, 'i'));
        const name = nameMatch ? nameMatch[1] : id;
        console.log(`     - ${id} (${name})`);
      });
    }
    
    if (businessRuleTasks.length > 0) {
      console.log(`\n   BusinessRuleTasks:`);
      businessRuleTasks.forEach(match => {
        const id = match[1];
        const nameMatch = xmlText.match(new RegExp(`<bpmn:businessRuleTask[^>]*id="${id}"[^>]*name="([^"]+)"`, 'i'));
        const name = nameMatch ? nameMatch[1] : id;
        console.log(`     - ${id} (${name})`);
      });
    }
    
    if (callActivities.length > 0) {
      console.log(`\n   Call Activities:`);
      callActivities.forEach(match => {
        const id = match[1];
        const nameMatch = xmlText.match(new RegExp(`<bpmn:callActivity[^>]*id="${id}"[^>]*name="([^"]+)"`, 'i'));
        const name = nameMatch ? nameMatch[1] : id;
        console.log(`     - ${id} (${name})`);
      });
    }
    
  } catch (error) {
    console.error(`Error: ${error}`);
  }
  
  console.log('\n' + '═'.repeat(80));
}

async function main() {
  const args = process.argv.slice(2);
  const fileName = args[0] || 'mortgage-se-credit-evaluation.bpmn';
  
  await debugNodeCount(fileName);
}

main();

