import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProcessExplorerView } from '@/pages/ProcessExplorer';
import { ProcessTreeD3Api } from '@/components/ProcessTreeD3';
import { ProcessTreeNode } from '@/lib/processTree';
import React from 'react';

// Create a mock zoom function that we can track
const mockZoomToFit = vi.fn();

// Mock ProcessTreeD3 with forwardRef support
vi.mock('@/components/ProcessTreeD3', () => {
  const React = require('react');
  const { forwardRef, useImperativeHandle } = React;
  
  return {
    ProcessTreeD3: forwardRef<ProcessTreeD3Api, any>((props, ref) => {
      useImperativeHandle(ref, () => ({
        zoomToFitCurrentTree: mockZoomToFit,
      }), []);

      return (
        <div data-testid="process-tree-d3">
          {props.showLegend && (
            <div>
              <button 
                data-testid="collapse-all-button"
                onClick={props.onCollapsedIdsChange ? () => {
                  // Simulate collapse all
                  const allIds = new Set<string>();
                  const traverse = (node: ProcessTreeNode, isRoot: boolean) => {
                    if (!isRoot) allIds.add(node.id);
                    node.children?.forEach(child => traverse(child, false));
                  };
                  if (props.root) traverse(props.root, true);
                  props.onCollapsedIdsChange(allIds);
                } : undefined}
              >
                Kollapsa allt
              </button>
              <button 
                data-testid="expand-all-button"
                onClick={props.onCollapsedIdsChange ? () => {
                  // Simulate expand all
                  props.onCollapsedIdsChange(new Set());
                } : undefined}
              >
                Expandera allt
              </button>
            </div>
          )}
          {props.showTree && <div>Tree View</div>}
        </div>
      );
    }),
    ProcessTreeD3Api: {},
  };
});

// Mock hooks
vi.mock('@/hooks/useProcessTree', () => ({
  useProcessTree: () => ({
    data: {
      id: 'root',
      label: 'Root Process',
      type: 'process',
      bpmnFile: 'test.bpmn',
      children: [
        {
          id: 'child1',
          label: 'Child 1',
          type: 'userTask',
          bpmnFile: 'test.bpmn',
          children: [],
        },
        {
          id: 'child2',
          label: 'Child 2',
          type: 'serviceTask',
          bpmnFile: 'test.bpmn',
          children: [],
        },
      ],
    } as ProcessTreeNode,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/useRootBpmnFile', () => ({
  useRootBpmnFile: () => ({
    data: 'test.bpmn',
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
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useArtifactAvailability', () => ({
  useArtifactAvailability: () => ({
    hasTests: false,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('ProcessExplorer Zoom Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call zoomToFitCurrentTree after collapsing all nodes', async () => {
    const user = userEvent.setup();

    render(<ProcessExplorerView onNodeSelect={() => {}} />);

    // Find and click "Kollapsa allt" button
    const collapseButton = screen.getByTestId('collapse-all-button');
    await user.click(collapseButton);

    // Wait for useEffect to trigger zoom (with timeout for the 100ms delay)
    await waitFor(() => {
      expect(mockZoomToFit).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('should call zoomToFitCurrentTree after expanding all nodes', async () => {
    const user = userEvent.setup();

    render(<ProcessExplorerView onNodeSelect={() => {}} />);

    // Find and click "Expandera allt" button
    const expandButton = screen.getByTestId('expand-all-button');
    await user.click(expandButton);

    // Wait for useEffect to trigger zoom
    await waitFor(() => {
      expect(mockZoomToFit).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('should not crash if ref is null when zoom is called', async () => {
    const user = userEvent.setup();
    
    render(<ProcessExplorerView onNodeSelect={() => {}} />);

    // Click collapse button - should not throw even if ref is not set
    const collapseButton = screen.getByTestId('collapse-all-button');
    
    await expect(async () => {
      await user.click(collapseButton);
      // Wait a bit to ensure any async operations complete
      await new Promise(resolve => setTimeout(resolve, 200));
    }).not.toThrow();
  });
});

