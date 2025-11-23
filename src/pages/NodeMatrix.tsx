import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllBpmnNodes, BpmnNodeData } from '@/hooks/useAllBpmnNodes';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, X, Filter, Download, Pencil, AlertTriangle, FileCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { getTestFileUrl, getDocumentationUrl, getNodeTestReportUrl } from '@/lib/artifactUrls';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { DocVariantBadges } from '@/components/DocVariantBadges';
import { getNodeDocViewerPath } from '@/lib/nodeArtifactPaths';
import {
  filterNodesByType,
  NODE_TYPE_FILTER_OPTIONS,
  countNodesByType,
  type NodeTypeFilterValue,
} from '@/lib/nodeMatrixFiltering';

type SortField = 'bpmnFile' | 'elementName' | 'nodeType';
type SortDirection = 'asc' | 'desc';

const NodeMatrix = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { nodes, loading } = useAllBpmnNodes();
  const { hasDorDod, hasTests } = useArtifactAvailability();
  const { toast } = useToast();
  const [sortField, setSortField] = useState<SortField>('bpmnFile');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Local state for inline editing
  const [editingFigmaCell, setEditingFigmaCell] = useState<string | null>(null);
  const [editingFigmaUrl, setEditingFigmaUrl] = useState<string>('');
  
  // Local state for optimistic updates (avoids full page reload)
  const [localNodeUpdates, setLocalNodeUpdates] = useState<Record<string, Partial<BpmnNodeData>>>({});
  
  // Filter för kolumnen "Typ" (NodeTypeFilter)
  const [selectedNodeType, setSelectedNodeType] = useState<NodeTypeFilterValue>('Alla');

  // Merge fetched nodes with local optimistic updates
  const mergedNodes = useMemo(() => {
    if (!nodes) return [];
    return nodes.map(node => {
      const nodeKey = `${node.bpmnFile}:${node.elementId}`;
      const updates = localNodeUpdates[nodeKey];
      return updates ? { ...node, ...updates } : node;
    });
  }, [nodes, localNodeUpdates]);

  // Sorterade noder (ofiltrerade; filter appliceras vid render)
  const sortedNodes = useMemo(() => {
    if (!mergedNodes || mergedNodes.length === 0) return [];

    const result = [...mergedNodes];

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [mergedNodes, sortField, sortDirection]);

  // Slutlig lista som visas i tabellen – filtrerad och sorterad
  const filteredAndSortedNodes = useMemo(() => {
    const result = filterNodesByType(sortedNodes, selectedNodeType);
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[NodeMatrix Filter Debug]', {
        selectedNodeType,
        sortedNodesCount: sortedNodes.length,
        filteredCount: result.length,
        sampleNodeTypes: sortedNodes.slice(0, 5).map(n => n.nodeType),
      });
    }
    return result;
  }, [sortedNodes, selectedNodeType]);

  // Kontrollera om det finns aktiva filter
  const hasActiveFilters = selectedNodeType !== 'Alla';

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredAndSortedNodes.map((node, index) => ({
        '#': index + 1,
        'BPMN Fil': node.bpmnFile,
        'Element ID': node.elementId,
        'Element Namn': node.elementName,
        'Typ': node.nodeType,
        'Figma URL': node.figmaUrl || '',
        'Dokumentation': getDocumentationUrl(node.bpmnFile, node.elementId),
        'Testfil': node.testFilePath || '',
        'Jira Namn': node.jiraName || '',
        'Jira Typ': node.jiraType || '',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 5 },   // #
        { wch: 40 },  // BPMN Fil
        { wch: 30 },  // Element ID
        { wch: 30 },  // Element Namn
        { wch: 20 },  // Typ
        { wch: 40 },  // Figma URL
        { wch: 50 },  // Dokumentation
        { wch: 40 },  // Testfil
        { wch: 60 },  // Jira Namn
        { wch: 20 },  // Jira Typ
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Noder');

      // Generate filename with timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
      const filename = `listvy_${timestamp}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      toast({
        title: 'Export slutförd',
        description: `${filteredAndSortedNodes.length} noder exporterade till ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Export misslyckades',
        description: error instanceof Error ? error.message : 'Ett fel uppstod vid export',
        variant: 'destructive',
      });
    }
  };

  const startEditingFigma = (node: BpmnNodeData) => {
    const nodeKey = `${node.bpmnFile}:${node.elementId}`;
    setEditingFigmaCell(nodeKey);
    setEditingFigmaUrl(node.figmaUrl || '');
  };

  const cancelEditingFigma = () => {
    setEditingFigmaCell(null);
    setEditingFigmaUrl('');
  };

  const saveFigmaUrl = async (node: BpmnNodeData) => {
    const nodeKey = `${node.bpmnFile}:${node.elementId}`;
    const newValue = editingFigmaUrl;
    const currentValue = node.figmaUrl || '';
    
    // If no change, just exit edit mode
    if (newValue === currentValue) {
      cancelEditingFigma();
      return;
    }
    
    // Optimistically update local state
    setLocalNodeUpdates(prev => ({
      ...prev,
      [nodeKey]: { ...prev[nodeKey], figmaUrl: newValue }
    }));
    
    // Exit edit mode immediately
    cancelEditingFigma();
    
    try {
      const { error } = await supabase
        .from('bpmn_element_mappings')
        .upsert({
          bpmn_file: node.bpmnFile,
          element_id: node.elementId,
          figma_url: newValue || null,
        }, {
          onConflict: 'bpmn_file,element_id'
        });

      if (error) throw error;

      toast({
        title: '✅ Sparat',
        description: 'Figma URL uppdaterad',
      });
    } catch (error) {
      console.error('Error saving Figma URL:', error);
      
      // Revert optimistic update on error
      setLocalNodeUpdates(prev => {
        const updated = { ...prev };
        delete updated[nodeKey];
        return updated;
      });
      
      toast({
        title: '⚠️ Kunde inte spara',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    }
  };

  const getShortenedUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.length > 30 
        ? urlObj.pathname.substring(0, 27) + '...' 
        : urlObj.pathname;
      return `${urlObj.hostname}${path}`;
    } catch {
      // If URL is invalid, just truncate it
      return url.length > 40 ? url.substring(0, 37) + '...' : url;
    }
  };

  const saveJiraType = async (node: BpmnNodeData, newValue: 'feature goal' | 'epic' | null) => {
    const nodeKey = `${node.bpmnFile}:${node.elementId}`;
    
    // Optimistically update local state
    setLocalNodeUpdates(prev => ({
      ...prev,
      [nodeKey]: { ...prev[nodeKey], jiraType: newValue }
    }));
    
    try {
      const { error } = await supabase
        .from('bpmn_element_mappings')
        .upsert({
          bpmn_file: node.bpmnFile,
          element_id: node.elementId,
          jira_type: newValue,
        }, {
          onConflict: 'bpmn_file,element_id'
        });

      if (error) throw error;

      // Show success toast
      toast({
        title: '✅ Sparat',
        description: 'Jira Type uppdaterad',
      });
    } catch (error) {
      console.error('Error saving Jira Type:', error);
      
      // Revert optimistic update on error
      setLocalNodeUpdates(prev => {
        const updated = { ...prev };
        delete updated[nodeKey];
        return updated;
      });
      
      toast({
        title: '⚠️ Kunde inte spara',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? ''}
        currentView="listvy"
        onViewChange={(v) => {
          if (v === 'diagram') navigate('/');
          else if (v === 'tree') navigate('/process-explorer');
          else if (v === 'tests') navigate('/test-report');
          else if (v === 'files') navigate('/files');
          else navigate('/node-matrix');
        }}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
        isTestsEnabled={hasTests}
      />

      {/* main med min-w-0 så att tabeller inte tvingar hela sidan att scrolla horisontellt */}
      <main className="flex-1 min-w-0 overflow-auto p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold">Listvy</h1>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedNodes.length} av {mergedNodes?.length || 0} noder
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Debug Typfilter: valt = {selectedNodeType} • UserTask =
              {' '}{countNodesByType(filteredAndSortedNodes, 'UserTask')}
              {' '}• CallActivity =
              {' '}{countNodesByType(filteredAndSortedNodes, 'CallActivity')}
              {' '}• BusinessRuleTask =
              {' '}{countNodesByType(filteredAndSortedNodes, 'BusinessRuleTask')}
              {' '}• ServiceTask =
              {' '}{countNodesByType(filteredAndSortedNodes, 'ServiceTask')}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedNodeType}
                onValueChange={(value) => {
                  console.log('[NodeMatrix] Filter changed:', value);
                  setSelectedNodeType(value as NodeTypeFilterValue);
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filtrera på Typ" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {NODE_TYPE_FILTER_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={exportToExcel}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportera till Excel
          </Button>
        </div>

        <div className="border rounded-lg">
          {/* Lokal horisontell scroll för tabellen, inte på root-level */}
          <div className="overflow-x-auto max-w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('bpmnFile')}>
                  BPMN Fil {sortField === 'bpmnFile' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('elementName')}>
                  Element {sortField === 'elementName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('nodeType')}>
                  Typ {sortField === 'nodeType' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Figma</TableHead>
                <TableHead>Dokumentation</TableHead>
                <TableHead>Doc-varianter</TableHead>
                <TableHead>Testrapport</TableHead>
                <TableHead>Jira Namn</TableHead>
                <TableHead>Jira Typ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedNodes.map((node, index) => {
                const issueSummary = node.diagnosticsSummary;
                const hasIssues = Boolean(issueSummary);
                return (
                  <TableRow key={`${node.bpmnFile}:${node.elementId}`}>
                    <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="text-xs font-mono">{node.bpmnFile}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-1">
                          {node.elementName}
                          {hasIssues && (
                            <AlertTriangle
                              className="h-3 w-3 text-amber-500"
                              title={issueSummary || 'Problem med subprocess'}
                            />
                          )}
                        </span>
                        <span className="text-muted-foreground">{node.elementId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="px-2 py-1 rounded bg-primary/10 text-primary">
                        {node.nodeType}
                      </span>
                    </TableCell>
                    <TableCell 
                      onDoubleClick={() => startEditingFigma(node)}
                      className="group"
                    >
                      {editingFigmaCell === `${node.bpmnFile}:${node.elementId}` ? (
                        <Input
                          value={editingFigmaUrl}
                          onChange={(e) => setEditingFigmaUrl(e.target.value)}
                          onBlur={() => saveFigmaUrl(node)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveFigmaUrl(node);
                            } else if (e.key === 'Escape') {
                              cancelEditingFigma();
                            }
                          }}
                          placeholder="Lägg till Figma-länk"
                          className="h-8 text-xs w-full"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2 min-h-[32px]">
                          {node.figmaUrl ? (
                            <>
                              <a
                                href={node.figmaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={node.figmaUrl}
                                className="text-blue-600 underline hover:text-blue-800 truncate max-w-[200px] inline-block text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {getShortenedUrl(node.figmaUrl)}
                              </a>
                              <button
                                type="button"
                                onClick={() => startEditingFigma(node)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity shrink-0"
                                title="Redigera Figma-länk"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditingFigma(node)}
                              className="text-muted-foreground hover:text-foreground text-xs"
                            >
                              + Lägg till länk
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {node.hasDocs ? (
                        <a
                          href={
                            node.documentationUrl ??
                            getDocumentationUrl(node.bpmnFile, node.elementId)
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                          title={`Dokumentation för ${node.elementName}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate max-w-[150px]">
                            Visa docs
                          </span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {node.hasDocs ? (
                        <DocVariantBadges
                          docId={getNodeDocViewerPath(
                            node.bpmnFile,
                            node.elementId,
                          )}
                          compact
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {node.elementId && node.bpmnFile ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              getNodeTestReportUrl(
                                node.bpmnFile,
                                node.elementId,
                              ).replace('#', ''),
                            );
                          }}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                          title="Visa testrapport för denna nod"
                        >
                          <FileCode className="h-3 w-3 shrink-0" />
                          <span>Testrapport</span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Ingen testrapport</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs" title={node.jiraName || undefined}>
                        {node.jiraName ? (
                          <span className="truncate max-w-[250px] inline-block">{node.jiraName}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">
                        {node.jiraType === 'feature goal' && 'Feature Goal'}
                        {node.jiraType === 'epic' && 'Epic'}
                        {!node.jiraType && <span className="text-muted-foreground">—</span>}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>

        {filteredAndSortedNodes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {hasActiveFilters ? 'Inga noder matchar de valda filtren' : 'Inga noder hittades'}
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
};

export default NodeMatrix;
