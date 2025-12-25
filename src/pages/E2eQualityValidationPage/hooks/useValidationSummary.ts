/**
 * Hook for calculating validation summary
 * 
 * Extracted from E2eQualityValidationPage.tsx
 */

import { useMemo } from 'react';
import type { ValidationResult } from '@/pages/E2eQualityValidationPage/types';

export function useValidationSummary(validationResults: ValidationResult[]) {
  return useMemo(() => {
    if (validationResults.length === 0) {
      return {
        avgScore: 0,
        totalIssues: 0,
        totalErrors: 0,
        totalWarnings: 0,
        scenarioCount: 0,
        mockQuality: {
          totalServiceTasks: 0,
          withMocks: 0,
          missingMocks: 0,
          goodQuality: 0,
          basicQuality: 0,
        },
        bpmnValidation: {
          totalBpmnServiceTasks: 0,
          totalDocumentedServiceTasks: 0,
          totalMissingServiceTasks: 0,
          totalBpmnUserTasks: 0,
          totalDocumentedUserTasks: 0,
          totalMissingUserTasks: 0,
          totalBpmnBusinessRuleTasks: 0,
          totalDocumentedBusinessRuleTasks: 0,
          totalMissingBusinessRuleTasks: 0,
          coveragePercentage: 100,
          userTaskCoveragePercentage: 100,
          businessRuleTaskCoveragePercentage: 100,
        },
      };
    }
    
    const avgScore = Math.round(
      validationResults.reduce((sum, r) => sum + r.overallScore, 0) / validationResults.length
    );
    const totalIssues = validationResults.reduce((sum, r) => sum + r.issues.length, 0);
    const totalErrors = validationResults.reduce(
      (sum, r) => sum + r.issues.filter((i) => i.severity === 'error').length,
      0
    );
    const totalWarnings = validationResults.reduce(
      (sum, r) => sum + r.issues.filter((i) => i.severity === 'warning').length,
      0
    );

    // Analysera mock-kvalitet
    const allMockQuality = validationResults
      .flatMap((r) => r.mockQuality || [])
      .filter((m) => m !== undefined);
    
    const mockQuality = {
      totalServiceTasks: allMockQuality.length,
      withMocks: allMockQuality.filter((m) => m.hasMock).length,
      missingMocks: allMockQuality.filter((m) => !m.hasMock).length,
      goodQuality: allMockQuality.filter((m) => m.responseQuality === 'good').length,
      basicQuality: allMockQuality.filter((m) => m.responseQuality === 'basic').length,
    };

    // Analysera BPMN-validering
    const allBpmnValidation = validationResults.flatMap((r) => r.bpmnValidation || []);
    const totalBpmnServiceTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.serviceTasksInBpmn.length,
      0
    );
    const totalDocumentedServiceTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.serviceTasksDocumented.length,
      0
    );
    const totalMissingServiceTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.missingServiceTasks.length,
      0
    );
    const totalBpmnUserTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.userTasksInBpmn.length,
      0
    );
    const totalDocumentedUserTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.userTasksDocumented.length,
      0
    );
    const totalMissingUserTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.missingUserTasks.length,
      0
    );
    const totalBpmnBusinessRuleTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.businessRuleTasksInBpmn.length,
      0
    );
    const totalDocumentedBusinessRuleTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.businessRuleTasksDocumented.length,
      0
    );
    const totalMissingBusinessRuleTasks = allBpmnValidation.reduce(
      (sum, b) => sum + b.missingBusinessRuleTasks.length,
      0
    );

    const coveragePercentage = totalBpmnServiceTasks > 0
      ? Math.round((totalDocumentedServiceTasks / totalBpmnServiceTasks) * 100)
      : 100;
    const userTaskCoveragePercentage = totalBpmnUserTasks > 0
      ? Math.round((totalDocumentedUserTasks / totalBpmnUserTasks) * 100)
      : 100;
    const businessRuleTaskCoveragePercentage = totalBpmnBusinessRuleTasks > 0
      ? Math.round((totalDocumentedBusinessRuleTasks / totalBpmnBusinessRuleTasks) * 100)
      : 100;

    return {
      avgScore,
      totalIssues,
      totalErrors,
      totalWarnings,
      scenarioCount: validationResults.length,
      mockQuality,
      bpmnValidation: {
        totalBpmnServiceTasks,
        totalDocumentedServiceTasks,
        totalMissingServiceTasks,
        totalBpmnUserTasks,
        totalDocumentedUserTasks,
        totalMissingUserTasks,
        totalBpmnBusinessRuleTasks,
        totalDocumentedBusinessRuleTasks,
        totalMissingBusinessRuleTasks,
        coveragePercentage,
        userTaskCoveragePercentage,
        businessRuleTaskCoveragePercentage,
      },
    };
  }, [validationResults]);
}

