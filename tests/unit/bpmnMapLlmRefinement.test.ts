import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refineBpmnMapWithLlm } from '@/lib/bpmn/bpmnMapLlmRefinement';
import type { BpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import { generateChatCompletion } from '@/lib/llmClient';

vi.mock('@/lib/llmClient', () => ({
  generateChatCompletion: vi.fn(),
  isLlmEnabled: vi.fn(() => true),
}));

describe('bpmnMapLlmRefinement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates unresolved callActivities with high confidence LLM suggestion', async () => {
    const map: BpmnMap = {
      orchestration: { root_process: 'root' },
      processes: [
        {
          id: 'root',
          bpmn_file: 'root.bpmn',
          process_id: 'root',
          call_activities: [
            {
              bpmn_id: 'Call_Sub',
              name: 'Subprocess',
              called_element: 'Sub',
              subprocess_bpmn_file: null,
              match_status: 'unresolved',
              needs_manual_review: true,
              source: 'heuristic',
            },
          ],
        },
        {
          id: 'Sub',
          bpmn_file: 'subprocess.bpmn',
          process_id: 'Sub',
          call_activities: [],
        },
      ],
    };

    vi.mocked(generateChatCompletion).mockResolvedValueOnce(
      JSON.stringify({
        subprocess_bpmn_file: 'subprocess.bpmn',
        process_id: 'Sub',
        confidence: 0.95,
        reason: 'Name and calledElement clearly match subprocess.',
      }),
    );

    const refined = await refineBpmnMapWithLlm(map);

    const ca = refined.processes[0].call_activities[0];
    expect(ca.subprocess_bpmn_file).toBe('subprocess.bpmn');
    expect(ca.source).toBe('llm');
    expect(ca.match_status).toBe('matched');
    expect(ca.needs_manual_review).toBe(false);
  });

  it('does not change manual callActivities', async () => {
    const map: BpmnMap = {
      orchestration: { root_process: 'root' },
      processes: [
        {
          id: 'root',
          bpmn_file: 'root.bpmn',
          process_id: 'root',
          call_activities: [
            {
              bpmn_id: 'Call_Manual',
              name: 'Manual',
              called_element: 'ManualSub',
              subprocess_bpmn_file: 'manual-subprocess.bpmn',
              match_status: 'matched',
              needs_manual_review: false,
              source: 'manual',
            },
          ],
        },
      ],
    };

    const refined = await refineBpmnMapWithLlm(map);
    const ca = refined.processes[0].call_activities[0];

    expect(ca.subprocess_bpmn_file).toBe('manual-subprocess.bpmn');
    expect(ca.source).toBe('manual');
    expect(generateChatCompletion).not.toHaveBeenCalled();
  });
});
