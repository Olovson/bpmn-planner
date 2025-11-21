import { vi, beforeEach } from 'vitest';

if (!('localStorage' in globalThis)) {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    length: 0,
  });
}

beforeEach(() => {
  // Provide a minimal localStorage for supabase client usage in tests
  if (!('localStorage' in globalThis)) {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      length: 0,
    });
  }

  if (!('fetch' in globalThis) || typeof globalThis.fetch !== 'function') {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('fetch not mocked'))));
    return;
  }

  // Ensure previous mocks don't leak between tests
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('fetch not mocked'))));
});
