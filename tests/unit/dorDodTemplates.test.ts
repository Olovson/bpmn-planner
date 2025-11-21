import { describe, it, expect } from 'vitest';
import { buildDorDodCriteria, getDorDodTemplates } from '@/lib/templates/dorDodTemplates';
import { generateDorDodForNodeType } from '@/lib/bpmnGenerators';

describe('DoR/DoD templates', () => {
  it('uses static templates for all supported node types', () => {
    const types = Object.keys(getDorDodTemplates());
    expect(types).toEqual(['ServiceTask', 'UserTask', 'BusinessRuleTask', 'CallActivity']);

    types.forEach((type) => {
      const criteria = buildDorDodCriteria(type as any, 'foo');
      expect(criteria.length).toBeGreaterThan(0);
      criteria.forEach((c) => {
        expect(c.criterion_key.startsWith('foo_')).toBe(true);
        expect(c.criterion_text).toMatch(/\w/);
      });
    });
  });

  it('generateDorDodForNodeType delegates to static templates (no LLM)', () => {
    const criteria = generateDorDodForNodeType('ServiceTask', 'bar');
    expect(criteria.some((c) => c.criterion_key === 'bar_purpose_defined')).toBe(true);
    expect(criteria.some((c) => c.criterion_text.includes('ServiceTasken'))).toBe(true);
  });
});

