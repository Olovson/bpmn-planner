import { describe, expect, it, vi } from 'vitest';
import { checkDocsAvailable, checkDorDodAvailable, checkTestReportAvailable } from '@/lib/artifactAvailability';

describe('artifactAvailability helpers', () => {
  it('returns true for docs when confluence URL exists', async () => {
    const result = await checkDocsAvailable('https://confluence.example.com/page', null, vi.fn());
    expect(result).toBe(true);
  });

  it('checks storage for docs when no confluence URL', async () => {
    const storageExists = vi.fn().mockResolvedValue(true);
    const result = await checkDocsAvailable(undefined, 'docs/nodes/mortgage/A_1.html', storageExists);
    expect(storageExists).toHaveBeenCalledWith('docs/nodes/mortgage/A_1.html');
    expect(result).toBe(true);
  });

  it('handles missing docs gracefully', async () => {
    const storageExists = vi.fn().mockResolvedValue(false);
    const result = await checkDocsAvailable(undefined, 'docs/nodes/mortgage/A_1.html', storageExists);
    expect(result).toBe(false);
  });

  it('uses HEAD check for Supabase-hosted test reports', async () => {
    const urlExists = vi.fn().mockResolvedValue(true);
    const result = await checkTestReportAvailable(
      'http://127.0.0.1:54321/storage/v1/object/public/reports/report.html',
      urlExists,
    );
    expect(urlExists).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when no test report URL provided', async () => {
    const result = await checkTestReportAvailable(undefined);
    expect(result).toBe(false);
  });

  it('detects dor/dod availability by element id or name', () => {
    const rows = [
      { bpmn_element_id: 'Task_1', subprocess_name: null },
      { bpmn_element_id: null, subprocess_name: 'My Subprocess' },
    ];
    expect(checkDorDodAvailable(rows, 'Task_1', null)).toBe(true);
    expect(checkDorDodAvailable(rows, 'Other', 'My Subprocess')).toBe(true);
    expect(checkDorDodAvailable(rows, 'Other', 'Missing')).toBe(false);
  });
});
