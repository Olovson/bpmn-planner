#!/usr/bin/env node

/**
 * Guide-script för att fixa Supabase CLI-profil problem.
 * 
 * Detta script guidar dig genom processen att återskapa din lokala
 * Supabase-projektprofil när CLI faller tillbaka till remote-projektet.
 * 
 * Användning:
 *   node scripts/fix-supabase-profile.mjs
 */

import { existsSync } from 'fs';
import { join } from 'path';

const PROFILE_PATH = join(process.cwd(), 'supabase', '.temp', 'profile');

console.log('🔧 Supabase CLI Profil-fix Guide\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Check if profile exists
const profileExists = existsSync(PROFILE_PATH);

if (profileExists) {
  console.log('✅ Lokal projektprofil finns redan:', PROFILE_PATH);
  console.log('\nOm du fortfarande har problem, följ ändå stegen nedan.\n');
} else {
  console.log('❌ Lokal projektprofil saknas:', PROFILE_PATH);
  console.log('\nDetta betyder att Supabase CLI faller tillbaka till ditt remote-projekt.');
  console.log('Vi behöver återskapa den lokala profilen.\n');
}

console.log('📋 Steg-för-steg instruktioner:\n');
console.log('1️⃣  Starta om lokalt Supabase för att återskapa projektprofilen:');
console.log('   → Kör: supabase start');
console.log('   → Vänta tills du ser "Started supabase local development setup."');
console.log('   → Detta skapar supabase/.temp/profile och kopplar CLI till projektmappen.\n');

console.log('2️⃣  Reset databasen:');
console.log('   → Kör: supabase db reset');
console.log('   → Detta stoppar stacken om nödvändigt, droppar/recreater databasen,');
console.log('     och kör alla migrationer från supabase/migrations.\n');

console.log('3️⃣  Starta upp allt igen och verifiera:');
console.log('   → Kör: supabase start (om den inte redan startade efter reset)');
console.log('   → Kör: npm run check:db-schema');
console.log('   → Du ska se att båda kontrollerna (generation_jobs.mode och');
console.log('     node_test_links.mode) passerar.\n');

console.log('4️⃣  Testa i appen:');
console.log('   → Starta dev-servern: npm run dev');
console.log('   → Gå till http://localhost:8080/#/files');
console.log('   → Kör "Generera allt (Local)" igen');
console.log('   → Om fel dyker upp, kopiera konsolloggen och visa den.\n');

console.log('═══════════════════════════════════════════════════════════\n');
console.log('💡 Tips:');
console.log('   - Kör alla kommandon i denna mapp (bpmn-planner)');
console.log('   - Se till att Docker körs innan du startar Supabase');
console.log('   - Om du ser "supabase start is not running", betyder det att');
console.log('     CLI inte hittar din lokala stack - följ steg 1 först.\n');

console.log('När du är klar med steg 1-3, kör: npm run check:db-schema');
console.log('för att verifiera att allt fungerar.\n');

