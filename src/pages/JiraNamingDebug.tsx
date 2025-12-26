import React, { useEffect, useState } from 'react';
import { useProcessTree } from '@/hooks/useProcessTree';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { supabase } from '@/integrations/supabase/client';
import { buildJiraName } from '@/lib/jiraNaming';

// Helper function to get Jira type from node type
const getJiraType = (nodeType: string): 'feature goal' | 'epic' | null => {
  if (nodeType === 'callActivity') return 'feature goal';
  if (nodeType === 'userTask' || nodeType === 'serviceTask' || nodeType === 'businessRuleTask') return 'epic';
  return null;
};
import type { ProcessTreeNode } from '@/lib/processTree';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppHeaderWithTabs, type ViewKey } from '@/components/AppHeaderWithTabs';
import { navigateToView } from '@/utils/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';

interface JiraNamingDebugData {
  nodeId: string;
  bpmnFile: string;
  elementId: string;
  nodeLabel: string;
  nodeType: string;
  jiraTypeFromDb: string | null;
  jiraNameFromDb: string | null;
  jiraTypeGenerated: string | null;
  jiraNameGenerated: string;
  parentPath: string[];
  parentNodes: Array<{ label: string; type: string }>;
  isTopLevelSubprocess: boolean;
  topLevelSubprocessLabel: string | null;
  matches: boolean;
}

export function JiraNamingDebugPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const { data: rootFile } = useRootBpmnFile();
  const { data: processTree, isLoading: treeLoading } = useProcessTree(rootFile || 'mortgage.bpmn');
  const [debugData, setDebugData] = useState<JiraNamingDebugData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dbMappings, setDbMappings] = useState<Map<string, { jiraType: string | null; jiraName: string | null }>>(new Map());

  useEffect(() => {
    const loadData = async () => {
      if (!processTree || treeLoading) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch all mappings from database
        const { data: mappings, error: mappingsError } = await supabase
          .from('bpmn_element_mappings')
          .select('bpmn_file, element_id, jira_type, jira_name');

        if (mappingsError) {
          throw mappingsError;
        }

        // Create a map for quick lookup
        const mappingsMap = new Map<string, { jiraType: string | null; jiraName: string | null }>();
        mappings?.forEach(m => {
          const key = `${m.bpmn_file}:${m.element_id}`;
          mappingsMap.set(key, {
            jiraType: m.jira_type,
            jiraName: m.jira_name,
          });
        });
        setDbMappings(mappingsMap);

        // Helper function to find top-level subprocess
        const findTopLevelSubprocess = (node: ProcessTreeNode, rootNode: ProcessTreeNode): ProcessTreeNode | null => {
          if (node.type === 'callActivity' && isDirectChildOfRoot(node, rootNode)) {
            return node;
          }
          const ancestors = findAncestors(node, rootNode);
          for (const ancestor of ancestors) {
            if (ancestor.type === 'callActivity' && isDirectChildOfRoot(ancestor, rootNode)) {
              return ancestor;
            }
          }
          return null;
        };

        const isDirectChildOfRoot = (node: ProcessTreeNode, rootNode: ProcessTreeNode): boolean => {
          return rootNode.children.some(child => child.id === node.id);
        };

        const findAncestors = (node: ProcessTreeNode, rootNode: ProcessTreeNode): ProcessTreeNode[] => {
          const ancestors: ProcessTreeNode[] = [];
          const findParent = (targetNode: ProcessTreeNode, current: ProcessTreeNode): ProcessTreeNode | null => {
            for (const child of current.children) {
              if (child.id === targetNode.id) {
                return current;
              }
              const found = findParent(targetNode, child);
              if (found) return found;
            }
            return null;
          };

          let current = node;
          while (current && current.id !== rootNode.id) {
            const parent = findParent(current, rootNode);
            if (!parent) break;
            ancestors.push(parent);
            current = parent;
          }
          return ancestors.reverse();
        };

        // Flatten tree and collect debug data
        const collectDebugData = (
          node: ProcessTreeNode,
          parentNodes: Array<{ label: string; type: string }> = [],
        ): JiraNamingDebugData[] => {
          const data: JiraNamingDebugData[] = [];

          // Skip root process node itself
          if (node.type !== 'process') {
            const elementId = node.bpmnElementId || node.id;
            const key = `${node.bpmnFile}:${elementId}`;
            const dbMapping = mappingsMap.get(key);

            // Build parent path (only callActivity for epics)
            const parentPath = node.type === 'callActivity'
              ? []
              : parentNodes
                  .filter(p => p.type === 'callActivity')
                  .map(p => p.label)
                  .filter(label => label !== processTree.label);

            // Generate Jira name
            const jiraTypeGenerated = getJiraType(node.type);
            const jiraNameGenerated = buildJiraName(node, processTree, parentPath);

            // Find top-level subprocess
            const topLevelSubprocess = node.type === 'callActivity' 
              ? findTopLevelSubprocess(node, processTree)
              : null;

            const isTopLevelSubprocess = topLevelSubprocess?.id === node.id;

            data.push({
              nodeId: node.id,
              bpmnFile: node.bpmnFile,
              elementId,
              nodeLabel: node.label,
              nodeType: node.type,
              jiraTypeFromDb: dbMapping?.jiraType || null,
              jiraNameFromDb: dbMapping?.jiraName || null,
              jiraTypeGenerated,
              jiraNameGenerated,
              parentPath,
              parentNodes: [...parentNodes],
              isTopLevelSubprocess,
              topLevelSubprocessLabel: topLevelSubprocess?.label || null,
              matches: dbMapping?.jiraName === jiraNameGenerated,
            });
          }

          // Recursively process children
          const childParentNodes = [...parentNodes, { label: node.label, type: node.type }];
          node.children.forEach(child => {
            data.push(...collectDebugData(child, childParentNodes));
          });

          return data;
        };

        const allDebugData = collectDebugData(processTree);
        setDebugData(allDebugData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [processTree, treeLoading]);

  const handleViewChange = (view: string) => {
    navigateToView(navigate, view as ViewKey);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const mismatches = debugData.filter(d => !d.matches && d.jiraNameFromDb !== null);
  const missingInDb = debugData.filter(d => d.jiraNameFromDb === null);
  const correctMatches = debugData.filter(d => d.matches);

  return (
    <div className="flex h-screen bg-background">
      <AppHeaderWithTabs
        userEmail={user?.email}
        currentView="files"
        onViewChange={handleViewChange}
        onOpenVersions={() => {}}
        onSignOut={handleSignOut}
        isTestsEnabled={hasTests}
      />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Jira Namngivning Debug</h1>
            <p className="text-muted-foreground mb-4">
              Jämför Jira-namn från databasen med de som genereras av den aktuella logiken.
              Felaktiga matchningar indikerar att databasen innehåller gamla namn från innan namngivningsreglerna uppdaterades.
            </p>
            {mismatches.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  ⚠️ {mismatches.length} felaktiga matchningar hittades
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                  Detta betyder att databasen innehåller gamla Jira-namn som genererades med tidigare namngivningsregler.
                  För att fixa detta:
                </p>
                <ol className="text-sm text-amber-800 dark:text-amber-200 list-decimal list-inside space-y-1">
                  <li>Gå till <strong>Filer</strong>-sidan</li>
                  <li>Klicka på <strong>"Bygg/uppdatera hierarki från root"</strong> för att generera nya korrekta Jira-namn</li>
                  <li>Alternativt: Använd <strong>"Reset registret"</strong> och bygg sedan om hierarkin</li>
                </ol>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  När hierarkin byggs om kommer alla Jira-namn att genereras med den korrekta logiken och sparas till databasen.
                </p>
              </div>
            )}
            {mismatches.length === 0 && missingInDb.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  ℹ️ {missingInDb.length} noder saknar Jira-namn i databasen
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Bygg om hierarkin via <strong>Filer</strong>-sidan för att generera Jira-namn för dessa noder.
                </p>
              </div>
            )}
          </div>

          {loading && <div className="text-center py-8">Laddar data...</div>}
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
              Fel: {error.message}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Totalt noder</div>
                  <div className="text-2xl font-bold">{debugData.length}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Korrekt matchning</div>
                  <div className="text-2xl font-bold text-green-600">{correctMatches.length}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Felaktiga matchningar</div>
                  <div className="text-2xl font-bold text-red-600">{mismatches.length}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Saknas i DB</div>
                  <div className="text-2xl font-bold text-yellow-600">{missingInDb.length}</div>
                </Card>
              </div>

              {/* Mismatches */}
              {mismatches.length > 0 && (
                <Card className="p-4 mb-6">
                  <h2 className="text-xl font-semibold mb-4 text-red-600">
                    Felaktiga matchningar ({mismatches.length})
                  </h2>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {mismatches.map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold">{item.nodeLabel}</div>
                            <div className="text-xs text-muted-foreground">
                              [{item.nodeType}] {item.bpmnFile}#{item.elementId}
                            </div>
                          </div>
                          <Badge variant="destructive">Mismatch</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Från databas:</div>
                            <div className="font-mono bg-white dark:bg-gray-800 p-2 rounded">
                              {item.jiraNameFromDb || '(saknas)'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Genererat:</div>
                            <div className="font-mono bg-white dark:bg-gray-800 p-2 rounded">
                              {item.jiraNameGenerated}
                            </div>
                          </div>
                        </div>
                        {item.parentPath.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Parent path: {item.parentPath.join(' → ')}
                          </div>
                        )}
                        {item.isTopLevelSubprocess && (
                          <div className="text-xs text-green-600 mt-1">✓ Top-level subprocess</div>
                        )}
                        {item.topLevelSubprocessLabel && !item.isTopLevelSubprocess && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Top-level: {item.topLevelSubprocessLabel}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* All Nodes Table */}
              <Card className="p-4">
                <h2 className="text-xl font-semibold mb-4">Alla noder</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Nod</th>
                        <th className="text-left p-2">Typ</th>
                        <th className="text-left p-2">DB Jira Namn</th>
                        <th className="text-left p-2">Genererat Jira Namn</th>
                        <th className="text-left p-2">Matchar</th>
                        <th className="text-left p-2">Parent Path</th>
                        <th className="text-left p-2">Top-level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debugData.map((item, idx) => (
                        <tr
                          key={idx}
                          className={`border-b hover:bg-muted/50 ${
                            !item.matches && item.jiraNameFromDb !== null ? 'bg-red-50 dark:bg-red-950/10' : ''
                          }`}
                        >
                          <td className="p-2">
                            <div className="font-medium">{item.nodeLabel}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.bpmnFile}#{item.elementId}
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge variant="outline">{item.nodeType}</Badge>
                          </td>
                          <td className="p-2 font-mono text-xs">
                            {item.jiraNameFromDb || (
                              <span className="text-muted-foreground">(saknas)</span>
                            )}
                          </td>
                          <td className="p-2 font-mono text-xs">{item.jiraNameGenerated}</td>
                          <td className="p-2">
                            {item.matches ? (
                              <Badge variant="default" className="bg-green-600">✓</Badge>
                            ) : item.jiraNameFromDb === null ? (
                              <Badge variant="outline">Saknas</Badge>
                            ) : (
                              <Badge variant="destructive">✗</Badge>
                            )}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {item.parentPath.length > 0 ? item.parentPath.join(' → ') : '(ingen)'}
                          </td>
                          <td className="p-2 text-xs">
                            {item.isTopLevelSubprocess ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                Ja
                              </Badge>
                            ) : item.topLevelSubprocessLabel ? (
                              <span className="text-muted-foreground">{item.topLevelSubprocessLabel}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default JiraNamingDebugPage;

