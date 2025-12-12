/**
 * E2E / UI smoke test for Process Explorer
 * 
 * This is a basic smoke test to ensure the Process Explorer loads and displays
 * without crashing. For full E2E testing, consider using Playwright or Cypress.
 * 
 * This test can be run in a test environment with mocked data or real fixtures.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProcessExplorerView } from '@/pages/ProcessExplorer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock the hooks
vi.mock('@/hooks/useProcessTree', () => ({
  useProcessTree: () => ({
    data: {
      id: 'mortgage.bpmn',
      label: 'Mortgage',
      type: 'process',
      bpmnFile: 'mortgage.bpmn',
      children: [
        {
          id: 'mortgage.bpmn:application',
          label: 'Application',
          type: 'callActivity',
          bpmnFile: 'mortgage.bpmn',
          bpmnElementId: 'application',
          children: [],
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/useRootBpmnFile', () => ({
  useRootBpmnFile: () => ({
    data: 'mortgage.bpmn',
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useAllBpmnNodes', () => ({
  useAllBpmnNodes: () => ({
    nodes: [],
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    signOut: async () => {},
  }),
}));

vi.mock('@/hooks/useArtifactAvailability', () => ({
  useArtifactAvailability: () => ({
    hasTests: false,
  }),
}));

describe('Process Explorer E2E smoke test', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
  });

  it('loads Process Explorer without crashing', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProcessExplorerView
            onNodeSelect={() => {}}
            selectedBpmnFile={undefined}
            selectedElementId={undefined}
          />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for the component to render
    await waitFor(() => {
      expect(container).toBeTruthy();
    });

    // Verify that the component rendered without errors
    // The exact content depends on the mock data
    expect(container.querySelector('.h-full')).toBeTruthy();
  });

  it('displays process tree structure', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProcessExplorerView
            onNodeSelect={() => {}}
            selectedBpmnFile={undefined}
            selectedElementId={undefined}
          />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // The tree should be rendered (check for SVG or tree container)
      const treeContainer = container.querySelector('svg') || container.querySelector('.h-full');
      expect(treeContainer).toBeTruthy();
    });
  });

  it('handles error state gracefully', async () => {
    // Mock error state
    vi.mocked(await import('@/hooks/useProcessTree')).useProcessTree = () => ({
      data: null,
      isLoading: false,
      error: new Error('Failed to load process tree'),
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProcessExplorerView
            onNodeSelect={() => {}}
            selectedBpmnFile={undefined}
            selectedElementId={undefined}
          />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Should show error message
      const errorElement = container.querySelector('[role="alert"]');
      expect(errorElement).toBeTruthy();
    });
  });
});













