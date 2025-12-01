import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import type { GlobalProjectConfig, PerNodeWorkItems, IntegrationWorkItems } from '@/types/globalProjectConfig';

/**
 * Calculate duration in days for a timeline node based on GlobalProjectConfig.
 * 
 * Priority:
 * 1. Per-node work items (if configured)
 * 2. Integration defaults (Stacc or Bank) for service tasks
 * 3. Default 2 weeks (14 days) for other nodes
 */
export function calculateNodeDuration(
  node: ProcessTreeNode,
  config: GlobalProjectConfig | null,
  useStaccIntegration: (bpmnFile: string, elementId: string) => boolean
): number {
  if (!config) {
    return 14; // Default 2 weeks
  }

  // Check for per-node work items override
  if (node.bpmnFile && node.bpmnElementId && config.perNodeWorkItems) {
    const perNodeConfig = config.perNodeWorkItems.find(
      (item) => item.bpmnFile === node.bpmnFile && item.elementId === node.bpmnElementId
    );

    if (perNodeConfig) {
      // Sum all work item weeks and convert to days
      const totalWeeks =
        (perNodeConfig.analysisWeeks ?? 0) +
        (perNodeConfig.implementationWeeks ?? 0) +
        (perNodeConfig.testingWeeks ?? 0) +
        (perNodeConfig.validationWeeks ?? 0);
      
      const duration = totalWeeks * 7; // Convert weeks to days
      
      if (import.meta.env.DEV && node.label?.toLowerCase().includes('fetch party')) {
        console.log(
          `[calculateNodeDuration] Per-node config for "${node.label}":`,
          { perNodeConfig, totalWeeks, duration }
        );
      }
      
      return duration;
    }
  }

  // For service tasks, use integration defaults
  if (node.type === 'serviceTask' && node.bpmnFile && node.bpmnElementId) {
    const useStacc = useStaccIntegration(node.bpmnFile, node.bpmnElementId);
    
    // Get integration defaults with fallback to safe defaults
    const staccDefaults = config?.staccIntegrationWorkItems;
    const bankDefaults = config?.bankIntegrationWorkItems;
    
    // Safe defaults if config or integration work items are missing
    const defaultStacc: IntegrationWorkItems = { analysisWeeks: 0, implementationWeeks: 2, testingWeeks: 0, validationWeeks: 0 };
    const defaultBank: IntegrationWorkItems = { analysisWeeks: 2, implementationWeeks: 4, testingWeeks: 2, validationWeeks: 0 };
    
    const integrationDefaults: IntegrationWorkItems = useStacc
      ? (staccDefaults || defaultStacc)
      : (bankDefaults || defaultBank);

    const totalWeeks =
      (integrationDefaults?.analysisWeeks ?? 0) +
      (integrationDefaults?.implementationWeeks ?? 0) +
      (integrationDefaults?.testingWeeks ?? 0) +
      (integrationDefaults?.validationWeeks ?? 0);

    const duration = totalWeeks * 7; // Convert weeks to days
    
    if (import.meta.env.DEV && node.label?.toLowerCase().includes('fetch party')) {
      console.log(
        `[calculateNodeDuration] Service task "${node.label}":`,
        {
          bpmnFile: node.bpmnFile,
          elementId: node.bpmnElementId,
          useStacc,
          staccDefaults,
          bankDefaults,
          integrationDefaults,
          totalWeeks,
          duration,
        }
      );
    }

    return duration;
  }

  // Default: 2 weeks (14 days)
  return 14;
}

/**
 * Create a duration calculator function that can be used in timeline scheduling.
 */
export function createDurationCalculator(
  config: GlobalProjectConfig | null,
  useStaccIntegration: (bpmnFile: string, elementId: string) => boolean
): (node: ProcessTreeNode) => number {
  return (node: ProcessTreeNode) => calculateNodeDuration(node, config, useStaccIntegration);
}

