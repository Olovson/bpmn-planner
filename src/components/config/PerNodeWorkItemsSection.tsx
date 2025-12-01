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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGlobalProjectConfig } from '@/contexts/GlobalProjectConfigContext';
import { useProcessTree } from '@/hooks/useProcessTree';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useIntegration } from '@/contexts/IntegrationContext';
import { STACC_INTEGRATION_MAPPING } from '@/data/staccIntegrationMapping';
import { extractAllTimelineNodes } from '@/lib/extractTimelineNodes';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProcessTreeNode } from '@/lib/processTree';
import {
  NODE_TYPE_FILTER_OPTIONS,
  type NodeTypeFilterValue,
} from '@/lib/nodeMatrixFiltering';
import { getNodeTypeFilterConfig } from '@/lib/bpmnNodeTypeFilters';
import { ProcessNodeType } from '@/lib/processTree';

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
  const { useStaccIntegration } = useIntegration();
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
  const [selectedNodeType, setSelectedNodeType] = useState<NodeTypeFilterValue>('Alla');
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Filter nodes by type
  const filteredNodes = useMemo(() => {
    if (selectedNodeType === 'Alla') {
      return enrichedNodes;
    }
    const target = selectedNodeType.toLowerCase();
    return enrichedNodes.filter((enriched) => {
      const nodeType = enriched.type.toLowerCase();
      return nodeType === target;
    });
  }, [enrichedNodes, selectedNodeType]);

  // Group nodes by type
  const groupedNodes = useMemo(() => {
    const groups: Record<string, EnrichedNode[]> = {
      serviceTask: [],
      callActivity: [],
      userTask: [],
      businessRuleTask: [],
      other: [],
    };

    filteredNodes.forEach((enriched) => {
      const type = enriched.type;
      if (type in groups) {
        groups[type].push(enriched);
      } else {
        groups.other.push(enriched);
      }
    });

    return groups;
  }, [filteredNodes]);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          Konfigurera extra arbetsmoment per nod. Endast bank-implementerade integrationer behöver dessa i timeline.
        </CardDescription>
      </CardHeader>
      {isExpanded && (
        <CardContent>
        {enrichedNodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Inga BPMN-noder hittades.</p>
            <p className="text-sm mt-2">Kontrollera att BPMN-filer är uppladdade och process tree är byggd.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Nodtypsfilter:
                </span>
                <Select
                  value={selectedNodeType}
                  onValueChange={(value) => {
                    setSelectedNodeType(value as NodeTypeFilterValue);
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Välj nodtyp att visa" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {NODE_TYPE_FILTER_OPTIONS.map((type) => {
                      if (type === 'Alla') {
                        return (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        );
                      }
                      const config = getNodeTypeFilterConfig(type as ProcessNodeType);
                      return (
                        <SelectItem key={type} value={type} title={config.description}>
                          {config.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
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
                                  disabled
                                  className="cursor-not-allowed opacity-50"
                                  aria-label={`${enriched.jiraName} - ${!enriched.isBankImplemented ? 'Använder Stacc integration' : 'Ersätter med bankens integration'} (redigera på integrationssidan)`}
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
      )}
    </Card>
  );
};
