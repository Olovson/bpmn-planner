import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, XCircle, FileCode, Clock, Package, ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { elementResourceMapping } from '@/data/elementResourceMapping';
import { testMapping, getAllTests, TestInfo } from '@/data/testMapping';
import { useTestResults, TestResult, TestScenario } from '@/hooks/useTestResults';
import { useE2EScenarios } from '@/hooks/useE2EScenarios';

interface TestGroup {
  id: string;
  label: string;
  bpmnFile?: string;
  nodeType?: string;
  stats: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    skipped: number;
  };
  tests: TestResult[];
}

const TestReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fileFilter, setFileFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  
  const { testResults, isLoading } = useTestResults();
  const { data: e2eScenarios, isLoading: e2eScenariosLoading } = useE2EScenarios();

  // Get testId from URL if present
  const urlTestId = searchParams.get('testId');

  // Auto-expand group containing the test from URL
  useEffect(() => {
    if (urlTestId && testResults.length > 0) {
      const test = testResults.find(t => t.id === urlTestId);
      if (test?.node_id) {
        setExpandedGroups([test.node_id]);
      }
    }
  }, [urlTestId, testResults]);

  // Group tests hierarchically by initiative and feature goals from annotations
  const testGroups = useMemo<TestGroup[]>(() => {
    if (!testResults || testResults.length === 0) return [];
    
    // Extract initiative and feature goal from test annotations
    const groupMap = new Map<string, TestResult[]>();
    
    testResults.forEach(test => {
      let initiative = 'Unknown';
      let featureGoal = '';
      
      // Try to parse from scenarios and annotations
      if (test.scenarios && Array.isArray(test.scenarios)) {
        const scenarios = test.scenarios as Array<{
          name?: string;
          status?: string;
          annotations?: Array<{ type: string; description: string }>;
        }>;
        
        if (scenarios.length > 0) {
          const firstScenario = scenarios[0];
          
          // Look for initiative in annotations
          const initiativeAnnotation = firstScenario.annotations?.find(
            a => a.type === 'initiative'
          );
          if (initiativeAnnotation) {
            initiative = initiativeAnnotation.description;
          }
          
          // Look for feature goal in annotations
          const featureAnnotation = firstScenario.annotations?.find(
            a => a.type === 'featureGoal'
          );
          if (featureAnnotation) {
            featureGoal = featureAnnotation.description;
          }
          
          // Fallback: parse from test name (e.g., "Application / Internal data gathering / ...")
          if (!initiativeAnnotation && firstScenario.name) {
            const nameParts = firstScenario.name.split('/').map(p => p.trim());
            if (nameParts.length > 0) {
              // First part is initiative
              initiative = nameParts[0].split('–')[0].trim();
              
              // Build feature goal from all parts except last (which is the node)
              if (nameParts.length > 2) {
                featureGoal = nameParts.slice(0, -1).join(' - ');
              }
            }
          }
        }
      }
      
      // Fallback: extract from file name
      if (initiative === 'Unknown') {
        const contextMatch = test.test_file.match(/([^/]+)\.spec\.ts$/);
        if (contextMatch) {
          initiative = contextMatch[1]
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
        } else {
          initiative = test.test_file;
        }
      }
      
      // Use feature goal as group key if available, otherwise use initiative
      const groupKey = featureGoal || initiative;
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      
      groupMap.get(groupKey)!.push(test);
    });
    
    // Build groups with stats
    const groups: TestGroup[] = [];
    
    groupMap.forEach((tests, groupKey) => {
      const stats = {
        total: tests.length,
        passed: tests.filter(t => t.status === 'passing').length,
        failed: tests.filter(t => t.status === 'failing').length,
        pending: tests.filter(t => t.status === 'pending').length,
        skipped: tests.filter(t => t.status === 'skipped').length,
      };
      
      groups.push({
        id: groupKey,
        label: groupKey,
        bpmnFile: tests[0]?.test_file,
        stats,
        tests,
      });
    });
    
    return groups;
  }, [testResults]);

  // Apply filters
  const filteredGroups = useMemo(() => {
    return testGroups
      .map(group => {
        const filteredTests = group.tests.filter(test => {
          if (statusFilter !== 'all' && test.status !== statusFilter) return false;
          if (fileFilter !== 'all' && test.test_file !== fileFilter) return false;
          return true;
        });

        if (filteredTests.length === 0) return null;

        return {
          ...group,
          tests: filteredTests,
          stats: {
            total: filteredTests.length,
            passed: filteredTests.filter(t => t.status === 'passing').length,
            failed: filteredTests.filter(t => t.status === 'failing').length,
            pending: filteredTests.filter(t => t.status === 'pending').length,
            skipped: filteredTests.filter(t => t.status === 'skipped').length,
          },
        };
      })
      .filter((g): g is TestGroup => g !== null);
  }, [testGroups, statusFilter, fileFilter]);

  // Get unique test files for filter
  const testFiles = useMemo(() => {
    const files = new Set(testResults.map(t => t.test_file));
    return Array.from(files).sort();
  }, [testResults]);

  // Analyze test coverage (using old logic for compatibility)
  const analysis = useMemo(() => {
    const allNodes = Object.keys(elementResourceMapping);
    const testedNodes = Object.keys(testMapping);
    const untestedNodes = allNodes.filter(node => !testedNodes.includes(node));
    
    // Check for orphan tests (tests not mapped to any node)
    const orphanTests = testedNodes.filter(nodeId => !allNodes.includes(nodeId));
    
    const allTests = getAllTests();
    const totalTests = allTests.reduce((sum, test) => sum + test.testCount, 0);
    const passingTests = allTests.filter(t => t.status === 'passing').length;
    const failingTests = allTests.filter(t => t.status === 'failing').length;
    const totalScenarios = allTests.reduce((sum, test) => sum + (test.scenarios?.length || 0), 0);
    
    const coverage = allNodes.length > 0 ? (testedNodes.length / allNodes.length) * 100 : 0;

    return {
      allNodes,
      testedNodes,
      untestedNodes,
      orphanTests,
      totalTests,
      passingTests,
      failingTests,
      totalScenarios,
      coverage,
      allTests,
    };
  }, []);

  const getStatusIcon = (status: TestInfo['status']) => {
    switch (status) {
      case 'passing':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failing':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TestInfo['status']) => {
    const variants: Record<TestInfo['status'], string> = {
      passing: 'bg-green-500/10 text-green-700 border-green-500/20',
      failing: 'bg-red-500/10 text-red-700 border-red-500/20',
      pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
      skipped: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
    };

    return (
      <Badge variant="outline" className={variants[status]}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Test Coverage Report</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Comprehensive overview of test coverage for BPMN nodes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-base px-4 py-2">
                {new Date().toLocaleDateString('sv-SE')}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-foreground">
                  {analysis.coverage.toFixed(0)}%
                </div>
                <Progress value={analysis.coverage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {analysis.testedNodes.length} / {analysis.allNodes.length} nodes tested
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{analysis.totalTests}</div>
                <p className="text-xs text-muted-foreground">
                  {analysis.totalScenarios} scenarios
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Passing
                  </span>
                  <span className="font-semibold">{analysis.passingTests}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" />
                    Failing
                  </span>
                  <span className="font-semibold">{analysis.failingTests}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    Untested
                  </span>
                  <span className="font-semibold">{analysis.untestedNodes.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-purple-600">
                    <Package className="h-4 w-4" />
                    Orphans
                  </span>
                  <span className="font-semibold">{analysis.orphanTests.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtrera tester
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Alla statusar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla statusar</SelectItem>
                  <SelectItem value="passing">Passing</SelectItem>
                  <SelectItem value="failing">Failing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Testfil</label>
              <Select value={fileFilter} onValueChange={setFileFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Alla filer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla filer</SelectItem>
                  {testFiles.map(file => (
                    <SelectItem key={file} value={file}>
                      {file.replace('tests/', '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* E2E Scenarios Section */}
        {e2eScenarios && e2eScenarios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                End-to-End (E2E) Test-scenarion
              </CardTitle>
              <CardDescription>
                Kompletta affärsflöden från start till slut
              </CardDescription>
            </CardHeader>
            <CardContent>
              {e2eScenariosLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  Laddar E2E-scenarion...
                </div>
              )}

              {!e2eScenariosLoading && e2eScenarios.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Inga E2E-scenarion hittades
                </div>
              )}

              {!e2eScenariosLoading && e2eScenarios.length > 0 && (
                <div className="space-y-3">
                  {e2eScenarios.map(scenario => (
                    <div
                      key={scenario.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileCode className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-semibold text-sm">
                              {scenario.initiative} – {scenario.name}
                            </span>
                          </div>
                          {scenario.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {scenario.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {scenario.tags.map(tag => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs bg-blue-500/10 text-blue-700 border-blue-200"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            {scenario.path.featureGoals.length > 0 && (
                              <div>
                                <span className="font-medium">Feature Goals:</span> {scenario.path.featureGoals.join(', ')}
                              </div>
                            )}
                            {scenario.path.keyNodes.length > 0 && (
                              <div>
                                <span className="font-medium">Key Nodes:</span> {scenario.path.keyNodes.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="secondary" className="text-xs">
                            @e2e
                          </Badge>
                          {scenario.testFilePath && (
                            <span className="text-xs text-muted-foreground">
                              {scenario.testFilePath.split('/').pop()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Drill-down Test Groups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Test-scenarion per BPMN-nod
            </CardTitle>
            <CardDescription>
              Klicka på en grupp för att se detaljer, klicka på ett test för att öppna i BPMN-vyn
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Laddar tester...
              </div>
            )}

            {!isLoading && filteredGroups.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Inga tester matchar de valda filtren
              </div>
            )}

            {!isLoading && filteredGroups.length > 0 && (
              <Accordion 
                type="multiple" 
                value={expandedGroups}
                onValueChange={setExpandedGroups}
                className="space-y-2"
              >
                {filteredGroups.map(group => (
                  <AccordionItem key={group.id} value={group.id} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50">
                      <div className="flex justify-between w-full items-center pr-4">
                        <span className="font-medium text-left">{group.label}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <Badge variant="outline" className="bg-green-500/10 text-green-700">
                            {group.stats.passed} ✅
                          </Badge>
                          <Badge variant="outline" className="bg-red-500/10 text-red-700">
                            {group.stats.failed} ❌
                          </Badge>
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">
                            {group.stats.pending} ⏺
                          </Badge>
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-700">
                            {group.stats.skipped} ⏭
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-2 mt-2">
                        {group.tests.map(test => (
                          <button
                            key={test.id}
                            className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                              urlTestId === test.id ? 'bg-primary/10 border-primary' : 'bg-card'
                            }`}
                            onClick={() => {
                              if (test.node_id) {
                                navigate(`/?file=mortgage.bpmn&element=${test.node_id}`);
                              }
                            }}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {test.status === 'passing' && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                                  {test.status === 'failing' && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                                  {test.status === 'pending' && <Clock className="h-4 w-4 text-yellow-600 shrink-0" />}
                                  {test.status === 'skipped' && <AlertCircle className="h-4 w-4 text-gray-600 shrink-0" />}
                                  <span className="font-medium text-sm">
                                    {test.node_name || test.test_file}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {test.test_file.replace('tests/', '')}
                                  {test.duration && ` • ${test.duration.toFixed(1)}s`}
                                </p>
                                {test.scenarios && test.scenarios.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {test.scenarios.map((scenario) => (
                                      <div key={scenario.id} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/30">
                                        <Badge
                                          variant={scenario.status === 'passing' ? 'default' : 'destructive'}
                                          className="text-[10px] h-4 px-1 shrink-0"
                                        >
                                          {scenario.status}
                                        </Badge>
                                        <div className="flex-1">
                                          <p className="font-medium">{scenario.name}</p>
                                          <p className="text-muted-foreground text-[10px] mt-0.5">
                                            {scenario.description}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {test.github_run_url && (
                                <a
                                  href={test.github_run_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-primary hover:underline shrink-0"
                                >
                                  GitHub →
                                </a>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Original Tabs for backwards compatibility */}
        <Tabs defaultValue="tested" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tested">
              Tested Nodes ({analysis.testedNodes.length})
            </TabsTrigger>
            <TabsTrigger value="untested">
              Untested Nodes ({analysis.untestedNodes.length})
            </TabsTrigger>
            <TabsTrigger value="orphans">
              Orphan Tests ({analysis.orphanTests.length})
            </TabsTrigger>
          </TabsList>

          {/* Tested Nodes */}
          <TabsContent value="tested">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Nodes with Test Coverage
                </CardTitle>
                <CardDescription>
                  BPMN nodes that have associated test cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Node ID</TableHead>
                      <TableHead>Node Name / Test link</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Tests</TableHead>
                      <TableHead className="text-right">Scenarios</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.allTests.map((test) => (
                      <TableRow key={test.nodeId} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-xs">
                          <a 
                            href={`/docs/${test.nodeId}.html`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary hover:underline"
                          >
                            {test.nodeId}
                          </a>
                        </TableCell>
                        <TableCell className="font-medium">
                          <a 
                            href={test.githubUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-primary hover:underline flex items-center gap-2"
                          >
                            {test.nodeName}
                            <FileCode className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell>{getStatusBadge(test.status)}</TableCell>
                        <TableCell className="text-right">
                          {test.testCount > 0 ? (
                            <button
                              className="underline text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/node-tests?nodeId=${encodeURIComponent(test.nodeId)}`);
                              }}
                            >
                              {test.testCount} {test.testCount === 1 ? 'test' : 'tester'}
                            </button>
                          ) : (
                            <span className="text-sm text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {test.scenarios?.length || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {test.duration ? `${test.duration}s` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Untested Nodes */}
          <TabsContent value="untested">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Nodes without Test Coverage
                </CardTitle>
                <CardDescription>
                  BPMN nodes that need test cases to be created
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.untestedNodes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Node ID</TableHead>
                        <TableHead>Resources</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.untestedNodes.map((nodeId) => {
                        const resources = elementResourceMapping[nodeId];
                        return (
                          <TableRow key={nodeId}>
                            <TableCell className="font-mono text-xs">{nodeId}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {resources?.jiraUrl && (
                                  <Badge variant="outline" className="text-xs">
                                    Jira
                                  </Badge>
                                )}
                                {resources?.figmaUrl && (
                                  <Badge variant="outline" className="text-xs">
                                    Figma
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/20">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                No tests
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground">Perfect Coverage!</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      All BPMN nodes have test coverage
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orphan Tests */}
          <TabsContent value="orphans">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Orphan Tests
                </CardTitle>
                <CardDescription>
                  Test cases not associated with any BPMN node
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.orphanTests.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test ID</TableHead>
                        <TableHead>Test File</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.orphanTests.map((testId) => {
                        const test = testMapping[testId];
                        return (
                          <TableRow key={testId} className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <TableCell className="font-mono text-xs">{testId}</TableCell>
                            <TableCell className="font-medium">
                              <a 
                                href={test.githubUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-primary hover:underline flex items-center gap-2"
                              >
                                <FileCode className="h-4 w-4 text-muted-foreground" />
                                {test.testFile}
                              </a>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20">
                                <Package className="h-3 w-3 mr-1" />
                                Orphan
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground">All Tests Mapped!</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      All test cases are associated with BPMN nodes
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CI/CD Integration Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">CI/CD Integration</CardTitle>
            <CardDescription>
              This report can be integrated into your CI/CD pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Access this report programmatically or add automated checks to ensure test coverage
                meets your quality standards before deployment.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Coverage: {analysis.coverage.toFixed(0)}%</Badge>
                <Badge variant="secondary">Total Tests: {analysis.totalTests}</Badge>
                <Badge variant="secondary">Scenarios: {analysis.totalScenarios}</Badge>
                <Badge variant={analysis.untestedNodes.length > 0 ? "destructive" : "default"}>
                  Untested: {analysis.untestedNodes.length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TestReport;
