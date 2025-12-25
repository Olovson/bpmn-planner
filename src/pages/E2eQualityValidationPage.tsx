import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { scenarios } from './E2eTestsOverviewPage';
import { useProcessTree } from '@/hooks/useProcessTree';
import type { ValidationResult } from '@/pages/E2eQualityValidationPage/types';
import { extractMockedEndpoints } from '@/pages/E2eQualityValidationPage/utils/validationHelpers';
import { validateScenario } from '@/pages/E2eQualityValidationPage/utils/validateScenario';
import { IssueCard } from '@/pages/E2eQualityValidationPage/components/IssueCard';
import { useValidationSummary } from '@/pages/E2eQualityValidationPage/hooks/useValidationSummary';

export default function E2eQualityValidationPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mockedEndpoints, setMockedEndpoints] = useState<Set<string>>(new Set());
  
  // Använd befintlig process tree istället för att läsa BPMN-filer igen
  const { data: processTree } = useProcessTree('mortgage.bpmn');

  // Ladda mocked endpoints och validera scenarios
  useEffect(() => {
    async function loadAndValidate() {
      setIsLoading(true);
      
      // Ladda mocked endpoints
      const endpoints = await extractMockedEndpoints();
      setMockedEndpoints(endpoints);
      
      // Validera alla scenarios med process tree
      const results = await Promise.all(
        scenarios.map((scenario) => validateScenario(scenario, endpoints, processTree || null))
      );
      
      setValidationResults(results);
      setIsLoading(false);
    }
    
    // Vänta på att process tree är laddad
    if (processTree !== undefined) {
      loadAndValidate();
    }
  }, [processTree]);

  // Använd hook för att beräkna sammanfattning
  const summary = useValidationSummary(validationResults);

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'test-coverage') navigate('/test-coverage');
    else if (view === 'e2e-quality-validation') navigate('/e2e-quality-validation');
    else if (view === 'files') navigate('/files');
    else if (view === 'timeline') navigate('/timeline');
    else if (view === 'configuration') navigate('/configuration');
    else if (view === 'styleguide') navigate('/styleguide');
    else navigate('/e2e-quality-validation');
  };

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? null}
        currentView="e2e-quality-validation"
        onViewChange={handleViewChange}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
      />
      <main className="ml-16 flex-1 flex flex-col gap-4 overflow-x-auto">
        <div className="w-full space-y-4 p-6">
          <Card>
            <CardHeader>
              <CardTitle>E2E Quality Validation</CardTitle>
              <CardDescription>
                Validerar kvaliteten på E2E-testscenarion och identifierar förbättringsområden
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Laddar och validerar...</div>
                </div>
              ) : (
                <>
              {/* Sammanfattning */}
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Sammanfattning</h3>
                  <Badge variant="outline" className="text-xs">
                    {mockedEndpoints.size} mocked endpoints hittade
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold">{summary.avgScore}%</div>
                    <div className="text-sm text-muted-foreground">Genomsnittlig Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{summary.scenarioCount}</div>
                    <div className="text-sm text-muted-foreground">Scenarion</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-destructive">{summary.totalErrors}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{summary.totalWarnings}</div>
                    <div className="text-sm text-muted-foreground">Warnings</div>
                  </div>
                </div>
                
                {/* BPMN-validering sammanfattning */}
                {summary.bpmnValidation && 
                 (summary.bpmnValidation.totalBpmnServiceTasks > 0 || 
                  summary.bpmnValidation.totalBpmnUserTasks > 0 || 
                  summary.bpmnValidation.totalBpmnBusinessRuleTasks > 0) && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-2">BPMN → Scenarios Mapping</h4>
                    
                    {/* ServiceTasks */}
                    {summary.bpmnValidation.totalBpmnServiceTasks > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium mb-2">ServiceTasks</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">
                              {summary.bpmnValidation.totalBpmnServiceTasks} totalt i BPMN
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-green-600">
                              {summary.bpmnValidation.totalDocumentedServiceTasks} dokumenterade
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {summary.bpmnValidation.coveragePercentage}% täckning
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-red-600">
                              {summary.bpmnValidation.totalMissingServiceTasks} saknas
                            </div>
                          </div>
                          <div>
                            <Badge
                              variant={
                                summary.bpmnValidation.coveragePercentage >= 90
                                  ? 'default'
                                  : summary.bpmnValidation.coveragePercentage >= 70
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {summary.bpmnValidation.coveragePercentage}% komplett
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* UserTasks */}
                    {summary.bpmnValidation.totalBpmnUserTasks > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium mb-2">UserTasks</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">
                              {summary.bpmnValidation.totalBpmnUserTasks} totalt i BPMN
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-green-600">
                              {summary.bpmnValidation.totalDocumentedUserTasks} dokumenterade
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {summary.bpmnValidation.userTaskCoveragePercentage}% täckning
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-red-600">
                              {summary.bpmnValidation.totalMissingUserTasks} saknas
                            </div>
                          </div>
                          <div>
                            <Badge
                              variant={
                                summary.bpmnValidation.userTaskCoveragePercentage >= 90
                                  ? 'default'
                                  : summary.bpmnValidation.userTaskCoveragePercentage >= 70
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {summary.bpmnValidation.userTaskCoveragePercentage}% komplett
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* BusinessRuleTasks */}
                    {summary.bpmnValidation.totalBpmnBusinessRuleTasks > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">BusinessRuleTasks</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">
                              {summary.bpmnValidation.totalBpmnBusinessRuleTasks} totalt i BPMN
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-green-600">
                              {summary.bpmnValidation.totalDocumentedBusinessRuleTasks} dokumenterade
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {summary.bpmnValidation.businessRuleTaskCoveragePercentage}% täckning
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-red-600">
                              {summary.bpmnValidation.totalMissingBusinessRuleTasks} saknas
                            </div>
                          </div>
                          <div>
                            <Badge
                              variant={
                                summary.bpmnValidation.businessRuleTaskCoveragePercentage >= 90
                                  ? 'default'
                                  : summary.bpmnValidation.businessRuleTaskCoveragePercentage >= 70
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {summary.bpmnValidation.businessRuleTaskCoveragePercentage}% komplett
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mock-kvalitet sammanfattning */}
                {summary.mockQuality && summary.mockQuality.totalServiceTasks > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-2">Mock-kvalitet</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <div className="font-medium">ServiceTasks</div>
                        <div className="text-muted-foreground">
                          {summary.mockQuality.totalServiceTasks} totalt
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-green-600">
                          {summary.mockQuality.withMocks} med mocks
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {summary.mockQuality.totalServiceTasks > 0
                            ? Math.round(
                                (summary.mockQuality.withMocks / summary.mockQuality.totalServiceTasks) * 100
                              )
                            : 0}
                          % täckning
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-red-600">
                          {summary.mockQuality.missingMocks} saknar mocks
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-yellow-600">
                          {summary.mockQuality.basicQuality} basic kvalitet
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-green-600">
                          {summary.mockQuality.goodQuality} bra kvalitet
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Valideringsresultat per scenario */}
              <div className="space-y-4">
                {validationResults.map((result) => {
                  const scoreColor =
                    result.overallScore >= 90
                      ? 'text-green-600'
                      : result.overallScore >= 70
                        ? 'text-yellow-600'
                        : 'text-red-600';

                  return (
                    <Card key={result.scenarioId}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{result.scenarioId}</CardTitle>
                            <CardDescription>{result.scenarioName}</CardDescription>
                          </div>
                          <Badge variant={result.overallScore >= 90 ? 'default' : 'destructive'}>
                            <span className={scoreColor}>{result.overallScore}%</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Kompletthet */}
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">Kompletthet</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <div className="font-medium">ServiceTasks</div>
                              <div className="text-muted-foreground">
                                {result.completeness.serviceTasks.documented}/
                                {result.completeness.serviceTasks.total} (
                                {result.completeness.serviceTasks.percentage}%)
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">UserTasks</div>
                              <div className="text-muted-foreground">
                                {result.completeness.userTasks.documented}/
                                {result.completeness.userTasks.total} (
                                {result.completeness.userTasks.percentage}%)
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">BusinessRuleTasks</div>
                              <div className="text-muted-foreground">
                                {result.completeness.businessRuleTasks.documented}/
                                {result.completeness.businessRuleTasks.total} (
                                {result.completeness.businessRuleTasks.percentage}%)
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">Subprocesses</div>
                              <div className="text-muted-foreground">
                                {result.completeness.subprocesses.documented}/
                                {result.completeness.subprocesses.total} (
                                {result.completeness.subprocesses.percentage}%)
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">API Mocks</div>
                              <div className="text-muted-foreground">
                                {result.completeness.apiMocks.mocked}/
                                {result.completeness.apiMocks.total} (
                                {result.completeness.apiMocks.percentage}%)
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BPMN Validation */}
                        {result.bpmnValidation && result.bpmnValidation.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">BPMN → Scenarios Mapping</h4>
                            {result.bpmnValidation.map((bpmnResult, idx) => {
                              const hasMissingServiceTasks = bpmnResult.missingServiceTasks.length > 0;
                              const hasMissingUserTasks = bpmnResult.missingUserTasks.length > 0;
                              const hasMissingBusinessRuleTasks = bpmnResult.missingBusinessRuleTasks.length > 0;
                              const hasAnyMissing = hasMissingServiceTasks || hasMissingUserTasks || hasMissingBusinessRuleTasks;
                              
                              return (
                                <div key={idx} className="mb-3 border rounded p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">{bpmnResult.bpmnFile}</span>
                                    <div className="flex gap-2">
                                      {bpmnResult.serviceTasksInBpmn.length > 0 && (
                                        <Badge variant={hasMissingServiceTasks ? 'destructive' : 'default'} className="text-xs">
                                          {bpmnResult.serviceTasksInBpmn.length} ServiceTasks
                                        </Badge>
                                      )}
                                      {bpmnResult.userTasksInBpmn.length > 0 && (
                                        <Badge variant={hasMissingUserTasks ? 'destructive' : 'default'} className="text-xs">
                                          {bpmnResult.userTasksInBpmn.length} UserTasks
                                        </Badge>
                                      )}
                                      {bpmnResult.businessRuleTasksInBpmn.length > 0 && (
                                        <Badge variant={hasMissingBusinessRuleTasks ? 'destructive' : 'default'} className="text-xs">
                                          {bpmnResult.businessRuleTasksInBpmn.length} BusinessRuleTasks
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* ServiceTasks */}
                                  {bpmnResult.serviceTasksInBpmn.length > 0 && (
                                    <div className="mb-3">
                                      <div className="text-xs text-muted-foreground mb-1">
                                        ServiceTasks: {bpmnResult.serviceTasksDocumented.length} / {bpmnResult.serviceTasksInBpmn.length} dokumenterade
                                      </div>
                                      {hasMissingServiceTasks && (
                                        <div className="mt-2">
                                          <div className="text-xs font-medium text-destructive mb-1">
                                            Saknade ServiceTasks ({bpmnResult.missingServiceTasks.length}):
                                          </div>
                                          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                            {bpmnResult.missingServiceTasks.map((task, taskIdx) => (
                                              <li key={taskIdx}>
                                                {task.name} ({task.id})
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* UserTasks */}
                                  {bpmnResult.userTasksInBpmn.length > 0 && (
                                    <div className="mb-3">
                                      <div className="text-xs text-muted-foreground mb-1">
                                        UserTasks: {bpmnResult.userTasksDocumented.length} / {bpmnResult.userTasksInBpmn.length} dokumenterade
                                      </div>
                                      {hasMissingUserTasks && (
                                        <div className="mt-2">
                                          <div className="text-xs font-medium text-destructive mb-1">
                                            Saknade UserTasks ({bpmnResult.missingUserTasks.length}):
                                          </div>
                                          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                            {bpmnResult.missingUserTasks.map((task, taskIdx) => (
                                              <li key={taskIdx}>
                                                {task.name} ({task.id})
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* BusinessRuleTasks */}
                                  {bpmnResult.businessRuleTasksInBpmn.length > 0 && (
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        BusinessRuleTasks: {bpmnResult.businessRuleTasksDocumented.length} / {bpmnResult.businessRuleTasksInBpmn.length} dokumenterade
                                      </div>
                                      {hasMissingBusinessRuleTasks && (
                                        <div className="mt-2">
                                          <div className="text-xs font-medium text-destructive mb-1">
                                            Saknade BusinessRuleTasks ({bpmnResult.missingBusinessRuleTasks.length}):
                                          </div>
                                          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                            {bpmnResult.missingBusinessRuleTasks.map((task, taskIdx) => (
                                              <li key={taskIdx}>
                                                {task.name} ({task.id})
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Mock Response Analysis */}
                        {result.mockResponseAnalysis && result.mockResponseAnalysis.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">Mock-responser vs Backend States</h4>
                            {result.mockResponseAnalysis.map((analysis, idx) => {
                              if (analysis.missingFields.length === 0) {
                                return null; // Visa bara om det finns saknade fält
                              }
                              return (
                                <div key={idx} className="mb-3 border rounded p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">{analysis.apiCall}</span>
                                    <Badge variant="secondary">
                                      {analysis.missingFields.length} saknade fält
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    Backend state fält: {analysis.backendStateFields.length} | 
                                    Mock response fält: {analysis.mockResponseFields.length}
                                  </div>
                                  {analysis.missingFields.length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-xs font-medium text-orange-600 mb-1">
                                        Saknade fält i mock-response:
                                      </div>
                                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                        {analysis.missingFields.map((field, fieldIdx) => (
                                          <li key={fieldIdx}>
                                            <code className="text-xs">{field.fullPath}</code> = {field.value}
                                          </li>
                                        ))}
                                      </ul>
                                      {analysis.suggestions.length > 0 && (
                                        <div className="mt-2 text-xs">
                                          <div className="font-medium mb-1">Förslag:</div>
                                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                            {analysis.suggestions.slice(0, 3).map((suggestion, sugIdx) => (
                                              <li key={sugIdx}>{suggestion}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Mock Quality Analysis */}
                        {result.mockQuality && result.mockQuality.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">Mock-kvalitet per ServiceTask</h4>
                            <div className="space-y-2">
                              {result.mockQuality.map((mock, idx) => {
                                const qualityColor =
                                  mock.responseQuality === 'good'
                                    ? 'text-green-600'
                                    : mock.responseQuality === 'basic'
                                      ? 'text-yellow-600'
                                      : 'text-red-600';
                                const qualityIcon =
                                  mock.responseQuality === 'good'
                                    ? '✅'
                                    : mock.responseQuality === 'basic'
                                      ? '⚠️'
                                      : '❌';

                                return (
                                  <div key={idx} className="text-sm border rounded p-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{mock.serviceTaskName}</span>
                                      <Badge variant={mock.hasMock ? 'default' : 'destructive'} className="text-xs">
                                        {qualityIcon} {mock.responseQuality}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {mock.apiCall}
                                    </div>
                                    {mock.mockEndpoint && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Mock: {mock.mockEndpoint}
                                      </div>
                                    )}
                                    {mock.issues.length > 0 && (
                                      <div className="text-xs text-destructive mt-1">
                                        {mock.issues.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Issues */}
                        {result.issues.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">
                              Issues ({result.issues.length})
                            </h4>
                            <div className="space-y-2">
                              {result.issues.map((issue, idx) => {
                                const icon =
                                  issue.severity === 'error'
                                    ? '❌'
                                    : issue.severity === 'warning'
                                      ? '⚠️'
                                      : 'ℹ️';
                                const color =
                                  issue.severity === 'error'
                                    ? 'text-destructive'
                                    : issue.severity === 'warning'
                                      ? 'text-yellow-600'
                                      : 'text-blue-600';

                                return (
                                  <IssueCard
                                    key={idx}
                                    issue={issue}
                                    icon={icon}
                                    color={color}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
