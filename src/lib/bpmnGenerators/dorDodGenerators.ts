import { CriterionCategory } from '@/hooks/useDorDodStatus';
import { buildDorDodCriteria, type DorDodNodeType } from '@/lib/templates/dorDodTemplates';
import type { DorDodCriterion, GeneratedCriterion } from './types';

/**
 * Genererar DoR/DoD-kriterier baserat på subprocess-namn och nodtyp.
 * @deprecated Använd generateDorDodForNodeType istället
 */
export function generateDorDodCriteria(subprocessName: string, nodeType: string): DorDodCriterion[] {
  const criteria: DorDodCriterion[] = [];
  const normalizedName = subprocessName.toLowerCase().replace(/\s+/g, '_');

  // Definition of Ready (DoR) criteria
  criteria.push(
    {
      criterion_type: 'dor',
      criterion_category: 'process_krav',
      criterion_key: `${normalizedName}_process_defined`,
      criterion_text: 'Processflöde är definierat och dokumenterat'
    },
    {
      criterion_type: 'dor',
      criterion_category: 'data_input_output',
      criterion_key: `${normalizedName}_data_inputs`,
      criterion_text: 'Input-data och källor är identifierade'
    },
    {
      criterion_type: 'dor',
      criterion_category: 'data_input_output',
      criterion_key: `${normalizedName}_data_outputs`,
      criterion_text: 'Output-data och destinationer är definierade'
    }
  );

  // Add type-specific DoR criteria
  if (nodeType === 'UserTask') {
    criteria.push(
      {
        criterion_type: 'dor',
        criterion_category: 'design',
        criterion_key: `${normalizedName}_ui_design`,
        criterion_text: 'UI-design är godkänd i Figma'
      },
      {
        criterion_type: 'dor',
        criterion_category: 'funktion_krav',
        criterion_key: `${normalizedName}_user_stories`,
        criterion_text: 'User stories är definierade och accepterade'
      }
    );
  }

  if (nodeType === 'ServiceTask' || nodeType === 'BusinessRuleTask') {
    criteria.push(
      {
        criterion_type: 'dor',
        criterion_category: 'data_api',
        criterion_key: `${normalizedName}_api_spec`,
        criterion_text: 'API-specifikation är dokumenterad'
      },
      {
        criterion_type: 'dor',
        criterion_category: 'teknik_arkitektur',
        criterion_key: `${normalizedName}_tech_design`,
        criterion_text: 'Teknisk design är granskad'
      }
    );
  }

  criteria.push(
    {
      criterion_type: 'dor',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_test_cases`,
      criterion_text: 'Testfall är definierade'
    },
    {
      criterion_type: 'dor',
      criterion_category: 'planering_beroenden',
      criterion_key: `${normalizedName}_dependencies`,
      criterion_text: 'Beroenden och integrationer är identifierade'
    },
    {
      criterion_type: 'dor',
      criterion_category: 'team_alignment',
      criterion_key: `${normalizedName}_team_aligned`,
      criterion_text: 'Team har diskuterat och förstår uppgiften'
    }
  );

  // Definition of Done (DoD) criteria
  criteria.push(
    {
      criterion_type: 'dod',
      criterion_category: 'funktion_krav',
      criterion_key: `${normalizedName}_requirements_met`,
      criterion_text: 'Alla funktionella krav är implementerade'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_tests_passed`,
      criterion_text: 'Alla tester är gröna (unit, integration, E2E)'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'test_kvalitet',
      criterion_key: `${normalizedName}_test_coverage`,
      criterion_text: 'Testtäckning uppfyller krav (minst 80%)'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'dokumentation',
      criterion_key: `${normalizedName}_documented`,
      criterion_text: 'Dokumentation är uppdaterad'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'teknik_drift',
      criterion_key: `${normalizedName}_deployed`,
      criterion_text: 'Kod är deployad till testmiljö'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'teknik_drift',
      criterion_key: `${normalizedName}_monitoring`,
      criterion_text: 'Monitoring och logging är implementerat'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'overlamning',
      criterion_key: `${normalizedName}_code_review`,
      criterion_text: 'Code review är genomförd och godkänd'
    },
    {
      criterion_type: 'dod',
      criterion_category: 'overlamning',
      criterion_key: `${normalizedName}_demo`,
      criterion_text: 'Demo genomförd för stakeholders'
    }
  );

  return criteria;
}

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



