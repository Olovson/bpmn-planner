import { describe, it, expect, vi } from 'vitest';

let storedParams = new URLSearchParams('file=foo.bpmn&el=Task_1');
const setParamsMock = vi.fn((next: any) => {
  if (next instanceof URLSearchParams) {
    storedParams = new URLSearchParams(next.toString());
  } else if (typeof next === 'function') {
    storedParams = new URLSearchParams(next(storedParams).toString());
  }
  return storedParams;
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', search: storedParams.toString() }),
  useSearchParams: () => [storedParams, setParamsMock] as const,
}));

import { useAppNavigation } from '@/hooks/useAppNavigation';

describe('useAppNavigation (mocked)', () => {
  it('reads and updates query params for file and element without React rendering', () => {
    const nav = useAppNavigation();
    expect(nav.currentFile).toBe('foo.bpmn');
    expect(nav.selectedElement).toBe('Task_1');

    nav.setFile('bar.bpmn');
    nav.setElement('Task_2');

    expect(setParamsMock).toHaveBeenCalled();
    const argsWithFile = setParamsMock.mock.calls
      .map((call) => call[0] as URLSearchParams)
      .find((next) => next.get('file') === 'bar.bpmn');
    const argsWithEl = setParamsMock.mock.calls
      .map((call) => call[0] as URLSearchParams)
      .find((next) => next.get('el') === 'Task_2');
    expect(argsWithFile?.get('file')).toBe('bar.bpmn');
    expect(argsWithEl?.get('el')).toBe('Task_2');
  });
});
