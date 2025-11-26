import { ProcessNodeType, PROCESS_NODE_STYLES } from '@/lib/processTree';

/**
 * Central configuration for BPMN node type filters used across the application.
 * This ensures consistent colors, labels, and descriptions across all pages.
 */

export interface BpmnNodeTypeFilterConfig {
  /** The BPMN node type */
  type: ProcessNodeType;
  /** Display label (Swedish) */
  label: string;
  /** Description explaining what this node type represents */
  description: string;
  /** Hex color code for visual representation */
  hexColor: string;
  /** Tailwind color class */
  tailwindColor: string;
  /** Icon/emoji for the node type */
  icon: string;
  /** Whether this type should be shown in filter UI (some types like 'process' are not filterable) */
  filterable: boolean;
  /** Display order in filter UI (lower = first) */
  order: number;
}

/**
 * Central configuration for all BPMN node type filters.
 * Used by Process Explorer, Timeline, Node Matrix, and other pages.
 */
export const BPMN_NODE_TYPE_FILTERS: BpmnNodeTypeFilterConfig[] = [
  {
    type: 'callActivity',
    label: 'Call Activity',
    description: 'Anropar en annan process eller subprocess. Representerar en Feature Goal i Jira.',
    hexColor: '#8B5CF6',
    tailwindColor: 'text-purple-600',
    icon: '📞',
    filterable: true,
    order: 1,
  },
  {
    type: 'userTask',
    label: 'User Task',
    description: 'En uppgift som kräver manuellt arbete från en användare. Representerar en Epic i Jira.',
    hexColor: '#DC2626',
    tailwindColor: 'text-red-600',
    icon: '👤',
    filterable: true,
    order: 2,
  },
  {
    type: 'serviceTask',
    label: 'Service Task',
    description: 'En automatiserad uppgift som anropar en extern tjänst eller integration. Representerar en Epic i Jira.',
    // Changed from orange to amber/yellow for better distinction from User Task (red)
    hexColor: '#F59E0B',
    tailwindColor: 'text-amber-600',
    icon: '⚙️',
    filterable: true,
    order: 3,
  },
  {
    type: 'businessRuleTask',
    label: 'Business Rule',
    description: 'En uppgift som utvärderar affärsregler eller DMN-beslut. Representerar en Business Rule i Jira.',
    hexColor: '#06B6D4',
    tailwindColor: 'text-cyan-600',
    icon: '📊',
    filterable: true,
    order: 4,
  },
  {
    type: 'process',
    label: 'Process',
    description: 'En BPMN-process eller huvudprocess. Visas vanligtvis inte i filter.',
    hexColor: '#3B82F6',
    tailwindColor: 'text-primary',
    icon: '📋',
    filterable: false,
    order: 0,
  },
  {
    type: 'dmnDecision',
    label: 'DMN Decision',
    description: 'Ett DMN-beslut. Används inte aktivt i filter ännu.',
    hexColor: '#64748B',
    tailwindColor: 'text-muted-foreground',
    icon: '🎯',
    filterable: false,
    order: 5,
  },
];

/**
 * Get filter configuration for a specific node type.
 */
export function getNodeTypeFilterConfig(type: ProcessNodeType): BpmnNodeTypeFilterConfig {
  const config = BPMN_NODE_TYPE_FILTERS.find(f => f.type === type);
  if (config) return config;
  
  // Fallback to processTree styles if not found
  const style = PROCESS_NODE_STYLES[type] || PROCESS_NODE_STYLES.default;
  return {
    type,
    label: style.label,
    description: `BPMN node type: ${type}`,
    hexColor: style.hexColor,
    tailwindColor: style.tailwindColor,
    icon: style.icon,
    filterable: false,
    order: 999,
  };
}

/**
 * Get all filterable node types (sorted by order).
 */
export function getFilterableNodeTypes(): BpmnNodeTypeFilterConfig[] {
  return BPMN_NODE_TYPE_FILTERS
    .filter(f => f.filterable)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get all filterable node type values (for use in Set<ProcessNodeType>).
 */
export function getFilterableNodeTypeValues(): ProcessNodeType[] {
  return getFilterableNodeTypes().map(f => f.type);
}

/**
 * Get default enabled filter types (all filterable types).
 */
export function getDefaultFilterSet(): Set<ProcessNodeType> {
  return new Set(getFilterableNodeTypeValues());
}

/**
 * Convert ProcessNodeType to NodeMatrix filter value format.
 * Used for compatibility with NodeMatrix filtering.
 */
export function toNodeMatrixFilterValue(type: ProcessNodeType): string {
  // NodeMatrix uses exact type names
  return type;
}

/**
 * Convert NodeMatrix filter value to ProcessNodeType.
 */
export function fromNodeMatrixFilterValue(value: string): ProcessNodeType | null {
  const config = BPMN_NODE_TYPE_FILTERS.find(f => f.type === value as ProcessNodeType);
  return config ? config.type : null;
}

