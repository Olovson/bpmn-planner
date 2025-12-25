import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import type { TestScenario } from '@/data/testMapping';
import type { PlannedScenarioRow } from '@/lib/plannedScenariosHelper';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(),
    })),
  },
}));

describe('testScenarioSaver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should save Claude-generated scenarios to database with correct format', async () => {
    const scenarios: TestScenario[] = [
      {
        id: 'scenario-1',
        name: 'Happy Path: Skapa ansökan',
        description: 'Kunden skapar ansökan',
        status: 'pending',
        category: 'happy-path',
        riskLevel: 'P1',
        assertionType: 'functional',
        steps: {
          when: ['Kunden öppnar ansökningsformuläret', 'Kunden fyller i personuppgifter'],
          then: ['Formuläret visas', 'Alla fält är ifyllda'],
        },
        expectedResult: 'Alla fält är ifyllda',
        acceptanceCriteria: ['Systemet validerar fält'],
      },
    ];
    
    const row: PlannedScenarioRow = {
      bpmn_file: 'test.bpmn',
      bpmn_element_id: 'test-element',
      provider: 'claude',
      origin: 'llm-doc',
      scenarios: scenarios.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        status: s.status,
        category: s.category,
        riskLevel: s.riskLevel,
        assertionType: s.assertionType,
        steps: s.steps,
        expectedResult: s.expectedResult,
        acceptanceCriteria: s.acceptanceCriteria,
      })),
    };
    
    const mockUpsert = vi.fn().mockResolvedValue({
      data: [{ id: 'test-id' }],
      error: null,
    });
    
    vi.mocked(supabase.from).mockReturnValue({
      upsert: mockUpsert,
    } as any);
    
    const { error } = await supabase
      .from('node_planned_scenarios')
      .upsert([row], {
        onConflict: 'bpmn_file,bpmn_element_id,provider,origin',
      });
    
    expect(error).toBeNull();
    expect(mockUpsert).toHaveBeenCalledWith([row], {
      onConflict: 'bpmn_file,bpmn_element_id,provider,origin',
    });
    
    expect(row).toHaveProperty('bpmn_file', 'test.bpmn');
    expect(row).toHaveProperty('bpmn_element_id', 'test-element');
    expect(row).toHaveProperty('provider', 'claude');
    expect(row).toHaveProperty('origin', 'llm-doc');
    expect(Array.isArray(row.scenarios)).toBe(true);
    expect(row.scenarios[0]).toHaveProperty('id', 'scenario-1');
    expect(row.scenarios[0]).toHaveProperty('name', 'Happy Path: Skapa ansökan');
    expect(row.scenarios[0]).toHaveProperty('status', 'pending');
    expect(row.scenarios[0]).toHaveProperty('category', 'happy-path');
    expect(row.scenarios[0]).toHaveProperty('riskLevel', 'P1');
    expect(row.scenarios[0]).toHaveProperty('assertionType', 'functional');
    expect(row.scenarios[0]).toHaveProperty('steps');
    expect(row.scenarios[0]).toHaveProperty('expectedResult', 'Alla fält är ifyllda');
    expect(row.scenarios[0]).toHaveProperty('acceptanceCriteria');
  });
  
  it('should handle database errors gracefully', async () => {
    const row: PlannedScenarioRow = {
      bpmn_file: 'test.bpmn',
      bpmn_element_id: 'test-element',
      provider: 'claude',
      origin: 'llm-doc',
      scenarios: [],
    };
    
    const mockUpsert = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });
    
    vi.mocked(supabase.from).mockReturnValue({
      upsert: mockUpsert,
    } as any);
    
    const { error } = await supabase
      .from('node_planned_scenarios')
      .upsert([row], {
        onConflict: 'bpmn_file,bpmn_element_id,provider,origin',
      });
    
    expect(error).toBeDefined();
    expect(error?.message).toBe('Database error');
  });
});
