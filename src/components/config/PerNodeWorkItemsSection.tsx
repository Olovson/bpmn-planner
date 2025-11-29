import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGlobalProjectConfig } from '@/contexts/GlobalProjectConfigContext';
import { useProcessTree } from '@/hooks/useProcessTree';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useIntegration } from '@/contexts/IntegrationContext';
import { STACC_INTEGRATION_MAPPING } from '@/data/staccIntegrationMapping';
import { extractAllTimelineNodes } from '@/lib/extractTimelineNodes';
import { supabase } from '@/integrations/supabase/client';
import { Settings, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProcessTreeNode } from '@/lib/processTree';

interface EnrichedNode {
  node: ProcessTreeNode;
  jiraName: string;
  type: string;
  description?: string;
  integrationSource?: string;
  isBankImplemented: boolean;
  analysisWeeks: number;
  implementationWeeks: number;
  testingWeeks: number;
  validationWeeks: number;
  hasCustomConfig: boolean;
  totalWeeks: number;
}

export const PerNodeWorkItemsSection = () => {
  const { data: rootFile } = useRootBpmnFile();
  const { data: processTree } = useProcessTree(rootFile || 'mortgage.bpmn');
  const { useStaccIntegration, setUseStaccIntegration } = useIntegration();
  const { toast } = useToast();
  const {
    staccIntegrationWorkItems,
    bankIntegrationWorkItems,
    perNodeWorkItems,
    getPerNodeWorkItems,
    setPerNodeWorkItems,
    bulkApplyDefaults,
  } = useGlobalProjectConfig();

  const [jiraMappings, setJiraMappings] = useState<Map<string, { jira_name: string | null }>>(new Map());
  const [bulkAnalysis, setBulkAnalysis] = useState('');
  const [bulkImplementation, setBulkImplementation] = useState('');

  // Extract all timeline nodes
  const allNodes = useMemo(() => {
    if (!processTree) return [];
    return extractAllTimelineNodes(processTree);
  }, [processTree]);

  // Fetch Jira mappings
  useEffect(() => {
    const fetchJiraMappings = async () => {
      if (allNodes.length === 0) return;

      try {
        const { data: mappings, error } = await supabase
          .from('bpmn_element_mappings')
          .select('bpmn_file, element_id, jira_name');

        if (error) {
          console.error('[PerNodeWorkItemsSection] Error fetching Jira mappings:', error);
        } else {
          const mappingsMap = new Map<string, { jira_name: string | null }>();
          mappings?.forEach((m) => {
            const key = `${m.bpmn_file}:${m.element_id}`;
            mappingsMap.set(key, { jira_name: m.jira_name });
          });
          setJiraMappings(mappingsMap);
        }
      } catch (error) {
        console.error('[PerNodeWorkItemsSection] Error fetching Jira mappings:', error);
      }
    };

    fetchJiraMappings();
  }, [allNodes]);

  // Enrich nodes with metadata and deduplicate by bpmnFile + elementId
  const enrichedNodes = useMemo(() => {
    const nodeMap = new Map<string, EnrichedNode>();
    
    allNodes.forEach((node) => {
      if (!node.bpmnFile || !node.bpmnElementId) return;

      // Create unique key for deduplication
      const uniqueKey = `${node.bpmnFile}:${node.bpmnElementId}`;
      
      // Skip if we've already processed this node
      if (nodeMap.has(uniqueKey)) return;

      // Get integration mapping
      const mapping = STACC_INTEGRATION_MAPPING.find(
        (m) => m.bpmnFile === node.bpmnFile && m.elementId === node.bpmnElementId
      );

      // Get Jira name
      const mappingKey = `${node.bpmnFile}:${node.bpmnElementId}`;
      const jiraMapping = jiraMappings.get(mappingKey);
      const jiraName = jiraMapping?.jira_name || node.label || 'N/A';

      // Check if bank-implemented
      const useStacc = useStaccIntegration(node.bpmnFile, node.bpmnElementId);
      const isBankImplemented = !useStacc;

      // Get per-node work items (or use defaults based on Stacc/Bank status)
      const nodeConfig = getPerNodeWorkItems(node.bpmnFile, node.bpmnElementId);
      const defaults = isBankImplemented ? bankIntegrationWorkItems : staccIntegrationWorkItems;
      
      const analysisWeeks = nodeConfig?.analysisWeeks ?? defaults.analysisWeeks;
      const implementationWeeks = nodeConfig?.implementationWeeks ?? defaults.implementationWeeks;
      const testingWeeks = nodeConfig?.testingWeeks ?? defaults.testingWeeks;
      const validationWeeks = nodeConfig?.validationWeeks ?? defaults.validationWeeks;
      const totalWeeks = analysisWeeks + implementationWeeks + testingWeeks + validationWeeks;

      nodeMap.set(uniqueKey, {
        node,
        jiraName,
        type: node.type,
        description: mapping?.description,
        integrationSource: mapping?.integrationSource,
        isBankImplemented,
        analysisWeeks,
        implementationWeeks,
        testingWeeks,
        validationWeeks,
        hasCustomConfig: !!nodeConfig,
        totalWeeks,
        defaultAnalysisWeeks: defaults.analysisWeeks,
        defaultImplementationWeeks: defaults.implementationWeeks,
        defaultTestingWeeks: defaults.testingWeeks,
        defaultValidationWeeks: defaults.validationWeeks,
      });
    });

    return Array.from(nodeMap.values());
  }, [allNodes, jiraMappings, useStaccIntegration, getPerNodeWorkItems, staccIntegrationWorkItems, bankIntegrationWorkItems]);

  // Group nodes by type
  const groupedNodes = useMemo(() => {
    const groups: Record<string, EnrichedNode[]> = {
      serviceTask: [],
      callActivity: [],
      userTask: [],
      businessRuleTask: [],
      other: [],
    };

    enrichedNodes.forEach((enriched) => {
      const type = enriched.type;
      if (type in groups) {
        groups[type].push(enriched);
      } else {
        groups.other.push(enriched);
      }
    });

    return groups;
  }, [enrichedNodes]);

  const handleChange = async (
    bpmnFile: string,
    elementId: string,
    field: 'analysisWeeks' | 'implementationWeeks' | 'testingAndValidationWeeks',
    value: string
  ) => {
    const weeks = parseFloat(value);
    if (isNaN(weeks) || weeks < 0 || weeks > 52) return;

    const current = getPerNodeWorkItems(bpmnFile, elementId);
    
    if (field === 'testingAndValidationWeeks') {
      // Slå ihop testing och validation - sätt testing till värdet, validation till 0
      await setPerNodeWorkItems(bpmnFile, elementId, {
        ...current,
        testingWeeks: weeks,
        validationWeeks: 0,
      });
    } else {
      await setPerNodeWorkItems(bpmnFile, elementId, {
        ...current,
        [field]: weeks,
      });
    }
  };

  const handleBulkApply = async (field: 'analysisWeeks' | 'implementationWeeks', value: string) => {
    const weeks = parseFloat(value);
    if (isNaN(weeks) || weeks < 0 || weeks > 52) {
      toast({
        title: 'Ogiltigt värde',
        description: 'Värdet måste vara mellan 0 och 52 veckor',
        variant: 'destructive',
      });
      return;
    }

    const nodesToUpdate = enrichedNodes
      .filter((n) => n.node.bpmnFile && n.node.bpmnElementId)
      .map((n) => ({ bpmnFile: n.node.bpmnFile!, elementId: n.node.bpmnElementId! }));

    for (const { bpmnFile, elementId } of nodesToUpdate) {
      const current = getPerNodeWorkItems(bpmnFile, elementId);
      await setPerNodeWorkItems(bpmnFile, elementId, {
        ...current,
        [field]: weeks,
      });
    }

    toast({
      title: 'Uppdaterat',
      description: `${nodesToUpdate.length} nod(er) har uppdaterats.`,
    });

    if (field === 'analysisWeeks') {
      setBulkAnalysis('');
    } else {
      setBulkImplementation('');
    }
  };

  const handleResetAll = async () => {
    if (!confirm('Är du säker på att du vill återställa alla värden till 0?')) return;

    const nodesToUpdate = enrichedNodes
      .filter((n) => n.node.bpmnFile && n.node.bpmnElementId)
      .map((n) => ({ bpmnFile: n.node.bpmnFile!, elementId: n.node.bpmnElementId! }));

    for (const { bpmnFile, elementId } of nodesToUpdate) {
      await setPerNodeWorkItems(bpmnFile, elementId, {
        analysisWeeks: 0,
        implementationWeeks: 0,
        testingWeeks: 0,
        validationWeeks: 0,
      });
    }

    toast({
      title: 'Återställt',
      description: 'Alla värden har återställts till 0.',
    });
  };

  const getTypeIcon = (type: string, isBank: boolean) => {
    if (type === 'serviceTask') {
      return isBank ? '🏦' : '🔌';
    }
    if (type === 'callActivity') return '📋';
    if (type === 'userTask') return '👤';
    if (type === 'businessRuleTask') return '📊';
    return '📄';
  };

  const getTypeLabel = (type: string) => {
    if (type === 'serviceTask') return 'Service Task';
    if (type === 'callActivity') return 'Call Activity';
    if (type === 'userTask') return 'User Task';
    if (type === 'businessRuleTask') return 'Business Rule';
    return type;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>BPMN-aktiviteter & Integrationer</CardTitle>
          </div>
        </div>
        <CardDescription>
          Konfigurera extra arbetsmoment per nod. Endast bank-implementerade integrationer behöver dessa i timeline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {enrichedNodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Inga BPMN-noder hittades.</p>
            <p className="text-sm mt-2">Kontrollera att BPMN-filer är uppladdade och process tree är byggd.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bulk actions */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Sätt alla Analys till:</span>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="52"
                  value={bulkAnalysis}
                  onChange={(e) => setBulkAnalysis(e.target.value)}
                  className="w-20 h-8"
                  placeholder="2"
                />
                <span className="text-sm text-muted-foreground">v</span>
                <Button
                  size="sm"
                  onClick={() => handleBulkApply('analysisWeeks', bulkAnalysis)}
                  disabled={!bulkAnalysis}
                >
                  Tillämpa
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Sätt alla Implementering till:</span>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="52"
                  value={bulkImplementation}
                  onChange={(e) => setBulkImplementation(e.target.value)}
                  className="w-20 h-8"
                  placeholder="4"
                />
                <span className="text-sm text-muted-foreground">v</span>
                <Button
                  size="sm"
                  onClick={() => handleBulkApply('implementationWeeks', bulkImplementation)}
                  disabled={!bulkImplementation}
                >
                  Tillämpa
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={handleResetAll}>
                Återställ alla till 0
              </Button>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Stacc</TableHead>
                    <TableHead className="w-[300px]">Nod</TableHead>
                    <TableHead className="text-center w-[100px]">Analys</TableHead>
                    <TableHead className="text-center w-[120px]">Implementering</TableHead>
                    <TableHead className="text-center w-[120px]">Testing & Validering</TableHead>
                    <TableHead className="text-center w-[80px]">Totalt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Service Tasks */}
                  {groupedNodes.serviceTask.length > 0 && (
                    <>
                      {groupedNodes.serviceTask.map((enriched) => {
                        const nodeKey = `${enriched.node.bpmnFile}::${enriched.node.bpmnElementId}`;
                        const uniqueKey = `${enriched.type}:${enriched.node.bpmnFile}:${enriched.node.bpmnElementId}`;
                        return (
                          <TableRow key={uniqueKey}>
                            <TableCell>
                              {enriched.type === 'serviceTask' ? (
                                <Checkbox
                                  checked={!enriched.isBankImplemented} // true = Stacc, false = Banken
                                  onCheckedChange={(checked) => {
                                    if (enriched.node.bpmnFile && enriched.node.bpmnElementId) {
                                      handleCheckboxChange(
                                        enriched.node.bpmnFile,
                                        enriched.node.bpmnElementId,
                                        checked === true
                                      );
                                    }
                                  }}
                                  className="cursor-pointer"
                                  aria-label={`${enriched.jiraName} - ${!enriched.isBankImplemented ? 'Använder Stacc integration' : 'Ersätter med bankens integration'}`}
                                />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span>{getTypeIcon(enriched.type, enriched.isBankImplemented)}</span>
                                  <span className="font-medium max-w-xs break-words whitespace-normal">
                                    {enriched.jiraName}
                                  </span>
                                  {enriched.type === 'serviceTask' && (
                                    <Badge variant={enriched.isBankImplemented ? 'default' : 'secondary'} className="text-xs">
                                      {enriched.isBankImplemented ? '🏦 Banken' : '🔌 Stacc'}
                                    </Badge>
                                  )}
                                  {enriched.hasCustomConfig && (
                                    <Badge variant="outline" className="text-xs">
                                      Anpassad
                                    </Badge>
                                  )}
                                </div>
                                {enriched.description && (
                                  <p className="text-xs text-muted-foreground">{enriched.description}</p>
                                )}
                                {enriched.integrationSource && (
                                  <p className="text-xs text-muted-foreground">
                                    {enriched.integrationSource}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="52"
                                value={enriched.analysisWeeks}
                                onChange={(e) =>
                                  handleChange(
                                    enriched.node.bpmnFile!,
                                    enriched.node.bpmnElementId!,
                                    'analysisWeeks',
                                    e.target.value
                                  )
                                }
                                className="h-8 w-16 text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="52"
                                value={enriched.implementationWeeks}
                                onChange={(e) =>
                                  handleChange(
                                    enriched.node.bpmnFile!,
                                    enriched.node.bpmnElementId!,
                                    'implementationWeeks',
                                    e.target.value
                                  )
                                }
                                className="h-8 w-16 text-center"
                                placeholder={enriched.hasCustomConfig ? undefined : String(enriched.defaultImplementationWeeks)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="52"
                                value={enriched.testingWeeks + enriched.validationWeeks}
                                onChange={(e) =>
                                  handleChange(
                                    enriched.node.bpmnFile!,
                                    enriched.node.bpmnElementId!,
                                    'testingAndValidationWeeks',
                                    e.target.value
                                  )
                                }
                                className="h-8 w-16 text-center"
                                placeholder={enriched.hasCustomConfig ? undefined : String(enriched.defaultTestingWeeks + enriched.defaultValidationWeeks)}
                              />
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {enriched.totalWeeks}v
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  )}

                  {/* Call Activities */}
                  {groupedNodes.callActivity.length > 0 &&
                    groupedNodes.callActivity.map((enriched) => (
                      <TableRow key={enriched.node.id}>
                        <TableCell>
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span>{getTypeIcon(enriched.type, enriched.isBankImplemented)}</span>
                              <span className="font-medium max-w-xs break-words whitespace-normal">
                                {enriched.jiraName}
                              </span>
                              {enriched.hasCustomConfig && (
                                <Badge variant="outline" className="text-xs">
                                  Anpassad
                                </Badge>
                              )}
                            </div>
                            {enriched.description && (
                              <p className="text-xs text-muted-foreground">{enriched.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.analysisWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'analysisWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.implementationWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'implementationWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.testingWeeks + enriched.validationWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'testingAndValidationWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                            placeholder={enriched.hasCustomConfig ? undefined : String(enriched.defaultTestingWeeks + enriched.defaultValidationWeeks)}
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {enriched.totalWeeks}v
                        </TableCell>
                      </TableRow>
                    ))}

                  {/* User Tasks */}
                  {groupedNodes.userTask.length > 0 &&
                    groupedNodes.userTask.map((enriched) => (
                      <TableRow key={enriched.node.id}>
                        <TableCell>
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span>{getTypeIcon(enriched.type, enriched.isBankImplemented)}</span>
                              <span className="font-medium max-w-xs break-words whitespace-normal">
                                {enriched.jiraName}
                              </span>
                              {enriched.hasCustomConfig && (
                                <Badge variant="outline" className="text-xs">
                                  Anpassad
                                </Badge>
                              )}
                            </div>
                            {enriched.description && (
                              <p className="text-xs text-muted-foreground">{enriched.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.analysisWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'analysisWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.implementationWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'implementationWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.testingWeeks + enriched.validationWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'testingAndValidationWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                            placeholder={enriched.hasCustomConfig ? undefined : String(enriched.defaultTestingWeeks + enriched.defaultValidationWeeks)}
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {enriched.totalWeeks}v
                        </TableCell>
                      </TableRow>
                    ))}

                  {/* Business Rule Tasks */}
                  {groupedNodes.businessRuleTask.length > 0 &&
                    groupedNodes.businessRuleTask.map((enriched) => (
                      <TableRow key={enriched.node.id}>
                        <TableCell>
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span>{getTypeIcon(enriched.type, enriched.isBankImplemented)}</span>
                              <span className="font-medium max-w-xs break-words whitespace-normal">
                                {enriched.jiraName}
                              </span>
                              {enriched.hasCustomConfig && (
                                <Badge variant="outline" className="text-xs">
                                  Anpassad
                                </Badge>
                              )}
                            </div>
                            {enriched.description && (
                              <p className="text-xs text-muted-foreground">{enriched.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.analysisWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'analysisWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.implementationWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'implementationWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.testingWeeks + enriched.validationWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'testingAndValidationWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                            placeholder={enriched.hasCustomConfig ? undefined : String(enriched.defaultTestingWeeks + enriched.defaultValidationWeeks)}
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {enriched.totalWeeks}v
                        </TableCell>
                      </TableRow>
                    ))}

                  {/* Other types */}
                  {groupedNodes.other.length > 0 &&
                    groupedNodes.other.map((enriched) => (
                      <TableRow key={enriched.node.id}>
                        <TableCell>
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span>{getTypeIcon(enriched.type, enriched.isBankImplemented)}</span>
                              <span className="font-medium max-w-xs break-words whitespace-normal">
                                {enriched.jiraName}
                              </span>
                              {enriched.hasCustomConfig && (
                                <Badge variant="outline" className="text-xs">
                                  Anpassad
                                </Badge>
                              )}
                            </div>
                            {enriched.description && (
                              <p className="text-xs text-muted-foreground">{enriched.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.analysisWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'analysisWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.implementationWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'implementationWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="52"
                            value={enriched.testingWeeks + enriched.validationWeeks}
                            onChange={(e) =>
                              handleChange(
                                enriched.node.bpmnFile!,
                                enriched.node.bpmnElementId!,
                                'testingAndValidationWeeks',
                                e.target.value
                              )
                            }
                            className="h-8 w-16 text-center"
                            placeholder={enriched.hasCustomConfig ? undefined : String(enriched.defaultTestingWeeks + enriched.defaultValidationWeeks)}
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {enriched.totalWeeks}v
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
