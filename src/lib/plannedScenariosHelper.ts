import { supabase } from '@/integrations/supabase/client';
import type { TestScenario } from '@/data/testMapping';

/**
 * Planned scenario row interface for database storage
 */
export interface PlannedScenarioRow {
  bpmn_file: string;
  bpmn_element_id: string;
  provider: 'claude' | 'chatgpt' | 'ollama';
  origin: 'design' | 'llm-doc' | 'spec-parsed' | 'claude-direct';
  scenarios: TestScenario[];
}

/**
 * Saves planned scenarios to database
 */
export async function savePlannedScenarios(
  rows: PlannedScenarioRow[],
  context: string = 'unknown',
): Promise<{ success: boolean; count: number; error?: any }> {
  if (rows.length === 0) {
    console.warn(`[savePlannedScenarios] No rows to save (context: ${context})`);
    return { success: true, count: 0 };
  }

  // DEBUG: Logga första scenariot för att se om given/when/then finns
  if (import.meta.env.DEV && rows.length > 0 && rows[0].scenarios.length > 0) {
    const firstRow = rows[0];
    const firstScenario = firstRow.scenarios[0];
    console.log(`[savePlannedScenarios] Saving scenarios for ${firstRow.bpmn_file}::${firstRow.bpmn_element_id} (context: ${context}):`, {
      origin: firstRow.origin,
      provider: firstRow.provider,
      scenarioCount: firstRow.scenarios.length,
      firstScenario: {
        id: firstScenario.id,
        name: firstScenario.name,
        hasGiven: !!firstScenario.given,
        hasWhen: !!firstScenario.when,
        hasThen: !!firstScenario.then,
        givenPreview: firstScenario.given?.substring(0, 100),
        whenPreview: firstScenario.when?.substring(0, 100),
        thenPreview: firstScenario.then?.substring(0, 100),
      },
    });
  }

  // VIKTIGT: Använd upsert med onConflict för att skriva över gamla rader
  // Vi tar redan bort alla gamla rader innan vi sparar nya (i featureGoalTestGenerator),
  // men upsert säkerställer att vi inte får dubbletter om något går fel
  const { data, error } = await (supabase as any).from('node_planned_scenarios').upsert(rows, {
    onConflict: 'bpmn_file,bpmn_element_id,provider',
  });

  if (error) {
    console.error(
      `[savePlannedScenarios] Failed to upsert planned scenarios (context: ${context}):`,
      error,
      'Rows attempted:',
      rows.length,
    );
    return { success: false, count: 0, error };
  }

  console.log(
    `[savePlannedScenarios] Successfully saved ${rows.length} planned scenarios (context: ${context})`,
  );
  return { success: true, count: rows.length };
}

