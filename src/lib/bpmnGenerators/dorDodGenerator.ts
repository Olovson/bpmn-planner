import { CriterionCategory } from '@/hooks/useDorDodStatus';
import { buildDorDodCriteria, type DorDodNodeType } from '@/lib/templates/dorDodTemplates';
import type { GeneratedCriterion } from './types';

/**
 * Genererar DoR/DoD-kriterier baserat på nodtyp.
 * Stödjer: ServiceTask, UserTask, BusinessRuleTask, CallActivity
 */
export function generateDorDodForNodeType(
  nodeType: DorDodNodeType,
  normalizedName: string
): GeneratedCriterion[] {
  const criteria = buildDorDodCriteria(nodeType, normalizedName);
  // Convert DorDodCriterion[] to GeneratedCriterion[]
  // GeneratedCriterion extends DorDodCriterion with optional metadata
  return criteria.map(c => ({
    ...c,
    criterion_category: c.criterion_category as CriterionCategory,
  }));
}

