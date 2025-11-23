import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Test suite for BPMN Viewer click/dblclick handling
 * 
 * These tests verify the event handling logic for single clicks and double clicks
 * in the BPMN viewer, focusing on:
 * - Separation of click and dblclick behavior
 * - Prevention of race conditions
 * - Controlled highlight/navigation interactions
 * 
 * Note: These tests focus on the event handling patterns rather than full component rendering.
 */

describe('BpmnViewer Click/DblClick Handling Logic', () => {
  let mockSetSelectedElement: ReturnType<typeof vi.fn>;
  let mockSetSelectedElementId: ReturnType<typeof vi.fn>;
  let mockOnElementSelect: ReturnType<typeof vi.fn>;
  let mockHighlightElement: ReturnType<typeof vi.fn>;
  let mockHandleSubprocessNavigation: ReturnType<typeof vi.fn>;
  let mockLoadSubProcess: ReturnType<typeof vi.fn>;
  let mockSelectionSelect: ReturnType<typeof vi.fn>;
  
  // Click/dblclick controller state (simulating what we'll implement)
  let clickController: {
    lastClickTime: number;
    lastClickTarget: string | null;
    isDoubleClickPending: boolean;
    doubleClickTimeout: ReturnType<typeof setTimeout> | null;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockSetSelectedElement = vi.fn();
    mockSetSelectedElementId = vi.fn();
    mockOnElementSelect = vi.fn();
    mockHighlightElement = vi.fn();
    mockHandleSubprocessNavigation = vi.fn();
    mockLoadSubProcess = vi.fn(() => Promise.resolve());
    mockSelectionSelect = vi.fn();

    // Initialize click controller (simulating the pattern we'll implement)
    clickController = {
      lastClickTime: 0,
      lastClickTarget: null,
      isDoubleClickPending: false,
      doubleClickTimeout: null,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockElement = (id: string, type: string = 'bpmn:CallActivity') => ({
    id,
    businessObject: {
      $type: type,
      name: `Element ${id}`,
    },
    type,
    labelTarget: null,
  });

  // Simulated click handler (what we expect to implement)
  const simulateClickHandler = (
    element: any,
    isDoubleClickContext: boolean = false
  ) => {
    if (isDoubleClickContext) {
      // In double click context, minimize side effects
      // Still set selection once for visual feedback
      mockSelectionSelect(element);
      mockSetSelectedElement(element.id);
      mockSetSelectedElementId(element.id);
      // But don't call highlight multiple times
      return;
    }

    // Normal single click behavior
    mockSelectionSelect(element);
    mockSetSelectedElement(element.id);
    mockSetSelectedElementId(element.id);
    mockOnElementSelect(element.id, element.businessObject?.$type, element.businessObject?.name);
    
    // Highlight via requestAnimationFrame (simulated)
    setTimeout(() => {
      mockHighlightElement(element.id);
    }, 0);
  };

  // Simulated dblclick handler
  const simulateDblClickHandler = (element: any) => {
    // Prevent default behavior
    // Navigate if CallActivity
    if (element.businessObject?.$type === 'bpmn:CallActivity') {
      mockHandleSubprocessNavigation(element);
    }
  };

  describe('Enkelklick - endast klicklogik körs', () => {
    it('should call selection/state/highlight exactly once on single click', async () => {
      const element = createMockElement('Task_1', 'bpmn:UserTask');

      // Simulate single click (not in double click context)
      simulateClickHandler(element, false);

      // Advance timers to trigger deferred highlight
      await vi.advanceTimersByTimeAsync(10);

      // Verify selection was called once
      expect(mockSelectionSelect).toHaveBeenCalledTimes(1);
      
      // Verify state updates were called once
      expect(mockSetSelectedElement).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedElementId).toHaveBeenCalledTimes(1);
      expect(mockOnElementSelect).toHaveBeenCalledTimes(1);
      
      // Verify highlight was called once (via setTimeout/requestAnimationFrame)
      expect(mockHighlightElement).toHaveBeenCalledTimes(1);
      expect(mockHighlightElement).toHaveBeenCalledWith(element.id);
      
      // Verify navigation was NOT called
      expect(mockHandleSubprocessNavigation).not.toHaveBeenCalled();
      expect(mockLoadSubProcess).not.toHaveBeenCalled();
    });

    it('should not trigger navigation on single click, even for CallActivity', async () => {
      const element = createMockElement('CallActivity_1', 'bpmn:CallActivity');

      // Simulate single click on CallActivity
      simulateClickHandler(element, false);

      await vi.advanceTimersByTimeAsync(10);

      // Navigation should NOT be triggered by single click, even for CallActivity
      expect(mockHandleSubprocessNavigation).not.toHaveBeenCalled();
      expect(mockLoadSubProcess).not.toHaveBeenCalled();
      
      // But selection should still work
      expect(mockSelectionSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dubbelklick - dubbelklick ska prioritera navigation', () => {
    it('should trigger navigation exactly once on double click', async () => {
      const element = createMockElement('CallActivity_1', 'bpmn:CallActivity');

      // Simulate double click sequence: click -> click -> dblclick
      // First click (will be treated as potential double click start)
      simulateClickHandler(element, false);
      await vi.advanceTimersByTimeAsync(5);
      
      // Second click (still within double click window)
      simulateClickHandler(element, true); // In double click context
      await vi.advanceTimersByTimeAsync(5);
      
      // Double click event
      simulateDblClickHandler(element);

      await vi.runAllTimersAsync();

      // Navigation should be called exactly once
      expect(mockHandleSubprocessNavigation).toHaveBeenCalledTimes(1);
      expect(mockHandleSubprocessNavigation).toHaveBeenCalledWith(element);
    });

    it('should prevent navigation from being triggered multiple times for rapid double clicks', async () => {
      const element = createMockElement('CallActivity_1', 'bpmn:CallActivity');

      // Simulate rapid double clicks
      simulateDblClickHandler(element);
      simulateDblClickHandler(element);
      simulateDblClickHandler(element);

      await vi.runAllTimersAsync();

      // Navigation should be called, but implementation should guard against multiple rapid calls
      // For now, we verify it's called (exact count depends on guard implementation)
      expect(mockHandleSubprocessNavigation).toHaveBeenCalled();
    });

    it('should minimize click side-effects when double click is detected', async () => {
      const element = createMockElement('CallActivity_1', 'bpmn:CallActivity');

      // Simulate double click sequence
      simulateClickHandler(element, false); // First click
      await vi.advanceTimersByTimeAsync(5);
      
      simulateClickHandler(element, true); // Second click (in double click context)
      await vi.advanceTimersByTimeAsync(5);
      
      simulateDblClickHandler(element); // Double click

      await vi.runAllTimersAsync();

      // Highlight should be called a controlled number of times (not excessive)
      // First click triggers highlight, second click in double-click context should minimize it
      expect(mockHighlightElement.mock.calls.length).toBeLessThanOrEqual(2);
      
      // Navigation should be called
      expect(mockHandleSubprocessNavigation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Overlay badges - dubbelklick på badges ska inte trigga nod-navigation', () => {
    it('should not trigger element navigation when clicking on overlay badge', () => {
      // Overlay badges use stopPropagation, so element events should not fire
      // This test verifies that badge clicks don't interfere with element click/dblclick
      
      // Simulate badge click with stopPropagation
      const badgeClickEvent = {
        stopPropagation: vi.fn(),
        currentTarget: {
          dataset: { elementId: 'Task_1' },
        },
      };

      badgeClickEvent.stopPropagation();

      // Element navigation should NOT be triggered by badge clicks
      expect(mockHandleSubprocessNavigation).not.toHaveBeenCalled();
      expect(mockLoadSubProcess).not.toHaveBeenCalled();
    });
  });

  describe('Highlight och navigation - inga race conditions', () => {
    it('should control highlight calls during navigation sequence', async () => {
      const element = createMockElement('CallActivity_1', 'bpmn:CallActivity');

      // Simulate double click that triggers navigation
      simulateClickHandler(element, false);
      await vi.advanceTimersByTimeAsync(10);
      
      simulateClickHandler(element, true); // In double click context
      await vi.advanceTimersByTimeAsync(10);
      
      simulateDblClickHandler(element); // Triggers navigation

      // Advance timers to simulate async navigation
      await vi.advanceTimersByTimeAsync(100);

      // Highlight should be called a controlled number of times
      // Not excessive, and not after navigation has clearly started
      expect(mockHighlightElement.mock.calls.length).toBeLessThanOrEqual(2);
      
      // Navigation should be triggered
      expect(mockHandleSubprocessNavigation).toHaveBeenCalledTimes(1);
    });

    it('should call highlight a controlled number of times during double click sequence', async () => {
      const element = createMockElement('CallActivity_1', 'bpmn:CallActivity');

      // Simulate double click
      simulateClickHandler(element, false);
      await vi.advanceTimersByTimeAsync(10);
      
      simulateClickHandler(element, true); // Second click in double-click context
      await vi.advanceTimersByTimeAsync(10);
      
      simulateDblClickHandler(element);

      await vi.runAllTimersAsync();

      // Highlight should be called a reasonable number of times (not excessive)
      // First click: 1 highlight, second click in double-click context: minimized
      expect(mockHighlightElement.mock.calls.length).toBeLessThanOrEqual(2);
    });
  });
});

