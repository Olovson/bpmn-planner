import type { DocumentationDocType } from '@/lib/llmDocumentation';
import type { TestScenario } from '@/data/testMapping';
import type { LlmProvider } from '../llmClientAbstraction';
import type { PlannedScenarioProvider } from './types';

/**
 * Maps LLM provider to PlannedScenarioProvider for database storage
 */
export function mapProviderToScenarioProvider(
  provider: LlmProvider,
  fallbackUsed: boolean,
): PlannedScenarioProvider | null {
  if (provider === 'cloud') return 'claude';
  if (provider === 'ollama') return 'ollama';
  return null;
}

/**
 * Builds test scenarios from Epic user stories.
 * Converts user stories with acceptance criteria to test scenarios for the database.
 */
export function buildScenariosFromEpicUserStories(
  docJson: any,
): TestScenario[] {
  if (!docJson || typeof docJson !== 'object') return [];
  const rawUserStories = Array.isArray(docJson.userStories) ? docJson.userStories : [];
  const scenarios: TestScenario[] = [];

  for (const userStory of rawUserStories) {
    if (!userStory || typeof userStory !== 'object') continue;
    
    const storyId = typeof userStory.id === 'string' && userStory.id.trim().length
      ? userStory.id.trim()
      : `US-${scenarios.length + 1}`;
    
    const role = typeof userStory.role === 'string' ? userStory.role.trim() : '';
    const goal = typeof userStory.goal === 'string' ? userStory.goal.trim() : '';
    const value = typeof userStory.value === 'string' ? userStory.value.trim() : '';
    const acceptanceCriteria = Array.isArray(userStory.acceptanceCriteria) 
      ? userStory.acceptanceCriteria 
      : [];

    // Create one scenario per user story
    // Description includes the user story format and acceptance criteria
    const storyDescription = `Som ${role} vill jag ${goal} så att ${value}`;
    const criteriaText = acceptanceCriteria.length > 0
      ? `\n\nAcceptanskriterier:\n${acceptanceCriteria.map((ac: string, idx: number) => `${idx + 1}. ${ac}`).join('\n')}`
      : '';
    
    const description = `${storyDescription}${criteriaText}`;

    // Determine category based on acceptance criteria content
    // Happy path: positive criteria, Edge: validation/edge cases, Error: error handling
    let category: 'happy-path' | 'edge-case' | 'error-case' = 'happy-path';
    const criteriaTextLower = criteriaText.toLowerCase();
    if (criteriaTextLower.includes('fel') || criteriaTextLower.includes('error') || criteriaTextLower.includes('timeout')) {
      category = 'error-case';
    } else if (criteriaTextLower.includes('validera') || criteriaTextLower.includes('edge') || criteriaTextLower.includes('gräns')) {
      category = 'edge-case';
    }

    scenarios.push({
      id: storyId,
      name: `User Story: ${goal}`,
      description,
      status: 'pending',
      category,
    });
  }

  return scenarios;
}

/**
 * Builds test scenarios from docJson.
 * For Epics: uses user stories
 * For Feature Goals and Business Rules: returns empty array (scenarios removed)
 */
export function buildScenariosFromDocJson(
  docType: DocumentationDocType,
  docJson: any,
): TestScenario[] {
  if (!docJson || typeof docJson !== 'object') return [];
  
  // For epics, use user stories
  if (docType === 'epic') {
    return buildScenariosFromEpicUserStories(docJson);
  }
  
  // Feature Goals and Business Rules no longer have scenarios
  return [];
}

/**
 * Bygger enklare LLM-scenarion för test-skeletons direkt från docJson.
 * För Epics: använder userStories
 * För Feature Goals/Business Rules: returnerar tom array (scenarios borttagna)
 * Används som första steg i pipen:
 *   docJson.userStories → Playwright-skelett
 * utan att göra ett separat LLM-anrop för testscript.
 */
export function buildTestSkeletonScenariosFromDocJson(
  docType: DocumentationDocType,
  docJson: any,
): { name: string; description: string; expectedResult?: string; steps?: string[] }[] {
  if (!docJson || typeof docJson !== 'object') return [];
  
  // For epics, use user stories
  if (docType === 'epic') {
    const rawUserStories = Array.isArray(docJson.userStories) ? docJson.userStories : [];
    const scenarios: { name: string; description: string; expectedResult?: string; steps?: string[] }[] = [];

    for (const userStory of rawUserStories) {
      if (!userStory || typeof userStory !== 'object') continue;
      
      const storyId = typeof userStory.id === 'string' && userStory.id.trim().length
        ? userStory.id.trim()
        : `US-${scenarios.length + 1}`;
      
      const role = typeof userStory.role === 'string' ? userStory.role.trim() : '';
      const goal = typeof userStory.goal === 'string' ? userStory.goal.trim() : '';
      const value = typeof userStory.value === 'string' ? userStory.value.trim() : '';
      const acceptanceCriteria = Array.isArray(userStory.acceptanceCriteria) 
        ? userStory.acceptanceCriteria 
        : [];

      const name = `User Story ${storyId}: ${goal}`;
      const storyDescription = `Som ${role} vill jag ${goal} så att ${value}`;
      const criteriaText = acceptanceCriteria.length > 0
        ? `\n\nAcceptanskriterier:\n${acceptanceCriteria.map((ac: string) => `- ${ac}`).join('\n')}`
        : '';
      
      const description = `${storyDescription}${criteriaText}`;

      scenarios.push({
        name,
        description,
        expectedResult: description,
        // steps lämnas tomma så generateTestSkeleton genererar generiska TODO-kommentarer
      });
    }

    return scenarios;
  }
  
  // Feature Goals and Business Rules no longer have scenarios
  return [];
}

