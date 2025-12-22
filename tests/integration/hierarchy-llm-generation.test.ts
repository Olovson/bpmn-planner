/**
 * @vitest-environment jsdom
 * 
 * Test för att verifiera LLM-generering med hierarki.
 * Detta testar scenariot som appen faktiskt använder för root-filer.
 * 
 * OBS: Detta test kräver LLM (Claude) och kan vara dyrt.
 * Kör endast när VITE_USE_LLM=true och VITE_ANTHROPIC_API_KEY är satt.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import type { LlmProvider } from '@/lib/llmClientAbstraction';

// Mock Supabase Storage (using vi.hoisted to avoid hoisting issues)
const { mockStorageList } = vi.hoisted(() => {
  return {
    mockStorageList: vi.fn(),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null })),
    })),
    storage: {
      from: vi.fn(() => ({
        list: mockStorageList,
        download: vi.fn(async () => ({ data: null, error: null })),
      })),
    },
  },
}));

const USE_LLM = process.env.VITE_USE_LLM === 'true' && process.env.VITE_ANTHROPIC_API_KEY;

describe.skipIf(!USE_LLM)('LLM generation with hierarchy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: filer finns INTE i Storage
    mockStorageList.mockResolvedValue({ data: [], error: null });
  });

  it('should generate documentation with LLM and hierarchy for root file', async () => {
    // Generate för root-fil med hierarki och LLM
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      [
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
        'mortgage-se-stakeholder.bpmn',
        'mortgage-se-object.bpmn',
        'mortgage-se-internal-data-gathering.bpmn',
      ],
      [],
      true, // useHierarchy = true (hierarkisk generering)
      true, // useLlm = true (använd LLM)
      undefined, // progressCallback
      'llm-slow-chatgpt', // generationSource
      'cloud' as LlmProvider, // llmProvider
      undefined, // nodeFilter
      undefined, // getVersionHashForFile
      undefined, // checkCancellation
      undefined, // abortSignal
      true, // isActualRootFile = true
      true, // forceRegenerate = true
    );

    // Verifiera att dokumentation genererades
    expect(result.docs.size).toBeGreaterThan(0);
    
    // Verifiera att Feature Goals genererades
    const featureGoals = Array.from(result.docs.keys()).filter(key =>
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    expect(featureGoals.length).toBeGreaterThan(0);
    
    // Verifiera att Epics genererades
    const epics = Array.from(result.docs.keys()).filter(key =>
      key.includes('nodes') && !key.includes('feature-goal')
    );
    expect(epics.length).toBeGreaterThan(0);
    
    console.log(`\n✓ Generated ${result.docs.size} docs with LLM + hierarchy`);
    console.log(`  Feature Goals: ${featureGoals.length}, Epics: ${epics.length}`);
  }, 300000); // 5 minuter timeout för LLM-generering
});
