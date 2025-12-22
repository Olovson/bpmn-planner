/**
 * BPMN Diff Overview Page
 * 
 * Visar översikt över ändringar i BPMN-filer och möjliggör selektiv regenerering
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Minus, 
  Edit, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface BpmnFileDiff {
  id: string;
  bpmn_file_id: string;
  file_name: string;
  diff_type: 'added' | 'removed' | 'modified' | 'unchanged';
  node_key: string;
  node_type: string;
  node_name: string | null;
  old_content: any;
  new_content: any;
  diff_details: any;
  detected_at: string;
  resolved_at: string | null;
}

interface MappingInfo {
  subprocess_bpmn_file?: string | null;
  matchStatus?: 'matched' | 'ambiguous' | 'lowConfidence' | 'unresolved';
  matchSource?: 'bpmn-map' | 'automatic' | 'none';
  diagnostics?: Array<{
    severity: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    context?: any;
  }>;
  calledElement?: string | null;
}

interface DiffSummary {
  file_name: string;
  added: number;
  removed: number;
  modified: number;
  unresolved: number;
  total: number;
}

export default function BpmnDiffOverviewPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [diffs, setDiffs] = useState<BpmnFileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiffs, setSelectedDiffs] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDiffs();
  }, []);

  const loadDiffs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bpmn_file_diffs')
        .select('*')
        .order('detected_at', { ascending: false });

      if (error) throw error;
      setDiffs(data || []);
    } catch (error) {
      console.error('Error loading diffs:', error);
      toast({
        title: 'Fel',
        description: 'Kunde inte ladda diff-översikt',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDiffSummary = (): DiffSummary[] => {
    const summaryMap = new Map<string, DiffSummary>();

    for (const diff of diffs) {
      if (!summaryMap.has(diff.file_name)) {
        summaryMap.set(diff.file_name, {
          file_name: diff.file_name,
          added: 0,
          removed: 0,
          modified: 0,
          unresolved: 0,
          total: 0,
        });
      }

      const summary = summaryMap.get(diff.file_name)!;
      summary.total++;

      if (diff.diff_type === 'added') summary.added++;
      else if (diff.diff_type === 'removed') summary.removed++;
      else if (diff.diff_type === 'modified') summary.modified++;

      if (!diff.resolved_at) summary.unresolved++;
    }

    return Array.from(summaryMap.values()).sort((a, b) => 
      b.unresolved - a.unresolved || a.file_name.localeCompare(b.file_name)
    );
  };

  const getDiffsForFile = (fileName: string): BpmnFileDiff[] => {
    return diffs
      .filter(d => d.file_name === fileName)
      .sort((a, b) => {
        // Sort by: unresolved first, then by type (added, modified, removed)
        if (!a.resolved_at && b.resolved_at) return -1;
        if (a.resolved_at && !b.resolved_at) return 1;
        
        const typeOrder = { added: 0, modified: 1, removed: 2 };
        return (typeOrder[a.diff_type] || 99) - (typeOrder[b.diff_type] || 99);
      });
  };

  const toggleFileExpanded = (fileName: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileName)) {
      newExpanded.delete(fileName);
    } else {
      newExpanded.add(fileName);
    }
    setExpandedFiles(newExpanded);
  };

  const toggleDiffSelection = (diffId: string) => {
    const newSelected = new Set(selectedDiffs);
    if (newSelected.has(diffId)) {
      newSelected.delete(diffId);
    } else {
      newSelected.add(diffId);
    }
    setSelectedDiffs(newSelected);
  };

  const selectAllUnresolved = () => {
    const unresolved = diffs
      .filter(d => !d.resolved_at && (d.diff_type === 'added' || d.diff_type === 'modified'))
      .map(d => d.id);
    setSelectedDiffs(new Set(unresolved));
  };

  const handleRegenerateSelected = async () => {
    if (selectedDiffs.size === 0) {
      toast({
        title: 'Inget valt',
        description: 'Välj minst en diff att regenerera',
        variant: 'destructive',
      });
      return;
    }

    setRegenerating(true);
    try {
      // Navigera till files-sidan och trigga generering
      // Systemet kommer automatiskt använda diff-filter för att bara regenerera valda noder
      const selectedDiffsData = diffs.filter(d => selectedDiffs.has(d.id));
      const filesToRegenerate = new Set(selectedDiffsData.map(d => d.file_name));
      
      toast({
        title: 'Omdirigerar',
        description: `Regenererar ${selectedDiffsData.length} noder i ${filesToRegenerate.size} fil(er)`,
      });

      // Navigera till files-sidan med query params för att trigga batch-generering
      navigate(`/files?regenerate=${Array.from(filesToRegenerate).join(',')}`);
    } catch (error) {
      console.error('Error regenerating:', error);
      toast({
        title: 'Fel',
        description: 'Kunde inte regenerera valda diff:er',
        variant: 'destructive',
      });
    } finally {
      setRegenerating(false);
    }
  };

  const getDiffTypeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'modified':
        return <Edit className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getDiffTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      added: 'default',
      removed: 'destructive',
      modified: 'secondary',
    };
    const colors: Record<string, string> = {
      added: 'bg-green-100 text-green-800',
      removed: 'bg-red-100 text-red-800',
      modified: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <Badge className={colors[type] || ''} variant={variants[type] || 'default'}>
        {type === 'added' && 'Tillagd'}
        {type === 'removed' && 'Borttagen'}
        {type === 'modified' && 'Ändrad'}
        {type === 'unchanged' && 'Oförändrad'}
      </Badge>
    );
  };

  const summary = getDiffSummary();
  const totalUnresolved = summary.reduce((sum, s) => sum + s.unresolved, 0);
  
  // Count mapping issues
  const mappingIssues = diffs.filter(d => 
    d.node_type === 'callActivity' && 
    !d.resolved_at && 
    (d.diff_type === 'added' || d.diff_type === 'modified')
  ).filter(d => {
    const mappingInfo: MappingInfo = d.new_content?.mapping || d.old_content?.mapping || {};
    return !mappingInfo.subprocess_bpmn_file || 
           mappingInfo.matchStatus === 'unresolved' || 
           mappingInfo.matchStatus === 'ambiguous';
  });

  return (
    <div className="flex h-screen bg-background">
      <AppHeaderWithTabs
        userEmail={user?.email}
        currentView="files"
        onViewChange={(v) => {
          if (v === 'files') navigate('/files');
          else if (v === 'diagram') navigate('/');
        }}
        onOpenVersions={() => {}}
        onSignOut={signOut}
      />

      <main className="flex-1 ml-16 overflow-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">BPMN Diff-översikt</h1>
              <p className="text-muted-foreground mt-2">
                Översikt över ändringar i BPMN-filer och selektiv regenerering
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/bpmn-folder-diff')}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Analysera Lokal Mapp
              </Button>
              <Button
                variant="outline"
                onClick={selectAllUnresolved}
                disabled={totalUnresolved === 0}
              >
                Välj alla olösta
              </Button>
              <Button
                onClick={handleRegenerateSelected}
                disabled={selectedDiffs.size === 0 || regenerating}
              >
                {regenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenererar...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerera valda ({selectedDiffs.size})
                  </>
                )}
              </Button>
            </div>
          </div>

          {mappingIssues.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Mappningsproblem upptäckta</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <div>
                    <strong>{mappingIssues.length} call activity(ies)</strong> har mappningsproblem:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {mappingIssues.slice(0, 5).map((issue, idx) => {
                      const mappingInfo: MappingInfo = issue.new_content?.mapping || issue.old_content?.mapping || {};
                      return (
                        <li key={idx}>
                          <span className="font-semibold">{issue.file_name}</span> → 
                          <span className="font-semibold ml-1">{issue.node_name || issue.node_key}</span>
                          {!mappingInfo.subprocess_bpmn_file ? (
                            <span className="text-muted-foreground ml-2">(Ingen subprocess hittad)</span>
                          ) : mappingInfo.matchStatus === 'ambiguous' ? (
                            <span className="text-muted-foreground ml-2">(Tvetydig matchning)</span>
                          ) : (
                            <span className="text-muted-foreground ml-2">(Ingen matchning)</span>
                          )}
                        </li>
                      );
                    })}
                    {mappingIssues.length > 5 && (
                      <li className="text-muted-foreground">
                        ...och {mappingIssues.length - 5} fler
                      </li>
                    )}
                  </ul>
                  <div className="text-sm mt-2">
                    💡 Uppdatera <code className="bg-muted px-1 rounded">bpmn-map.json</code> för att koppla call activities till subprocess-filer.
                    Du kan använda "Föreslagna uppdateringar till bpmn-map.json" på filhanteringssidan.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {totalUnresolved > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Olösta ändringar</AlertTitle>
              <AlertDescription>
                Det finns {totalUnresolved} olösta ändringar. 
                När du genererar artefakter kommer systemet automatiskt regenerera noder som har ändrats eller lagts till.
                Om ingen diff-data finns för en fil, regenereras allt automatiskt (fallback-strategi).
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : summary.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Inga diff:er hittades</h3>
              <p className="text-muted-foreground">
                När du uppdaterar BPMN-filer kommer ändringar att visas här.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {summary.map((fileSummary) => {
                const fileDiffs = getDiffsForFile(fileSummary.file_name);
                const isExpanded = expandedFiles.has(fileSummary.file_name);

                return (
                  <Card key={fileSummary.file_name} className="p-4">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleFileExpanded(fileSummary.file_name)}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <h3 className="text-lg font-semibold">{fileSummary.file_name}</h3>
                            <div className="flex gap-2">
                              {fileSummary.added > 0 && (
                                <Badge className="bg-green-100 text-green-800">
                                  +{fileSummary.added}
                                </Badge>
                              )}
                              {fileSummary.removed > 0 && (
                                <Badge className="bg-red-100 text-red-800">
                                  -{fileSummary.removed}
                                </Badge>
                              )}
                              {fileSummary.modified > 0 && (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  ~{fileSummary.modified}
                                </Badge>
                              )}
                              {fileSummary.unresolved > 0 && (
                                <Badge variant="destructive">
                                  {fileSummary.unresolved} olösta
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <Table className="mt-4">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Typ</TableHead>
                              <TableHead>Nod</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Ändringar</TableHead>
                              <TableHead>Upptäckt</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fileDiffs.map((diff) => {
                              const isSelected = selectedDiffs.has(diff.id);
                              const isResolved = !!diff.resolved_at;

                              return (
                                <TableRow
                                  key={diff.id}
                                  className={isResolved ? 'opacity-50' : ''}
                                >
                                  <TableCell>
                                    {!isResolved && (
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleDiffSelection(diff.id)}
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {getDiffTypeIcon(diff.diff_type)}
                                      {getDiffTypeBadge(diff.diff_type)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{diff.node_name || diff.node_key}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {diff.node_type} • {diff.node_key}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {isResolved ? (
                                      <Badge variant="outline" className="bg-green-50">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Löst
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive">Olöst</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-2">
                                      {/* Mappningsinformation för call activities */}
                                      {diff.node_type === 'callActivity' && (
                                        <div className="space-y-1">
                                          {(() => {
                                            const mappingInfo: MappingInfo = diff.new_content?.mapping || diff.old_content?.mapping || {};
                                            const hasMappingIssue = !mappingInfo.subprocess_bpmn_file || 
                                              mappingInfo.matchStatus === 'unresolved' || 
                                              mappingInfo.matchStatus === 'ambiguous';
                                            
                                            if (hasMappingIssue) {
                                              return (
                                                <Alert variant="destructive" className="py-2">
                                                  <AlertCircle className="h-4 w-4" />
                                                  <AlertTitle className="text-sm font-semibold">
                                                    Mappningsproblem
                                                  </AlertTitle>
                                                  <AlertDescription className="text-xs space-y-1 mt-1">
                                                    {!mappingInfo.subprocess_bpmn_file ? (
                                                      <div>
                                                        <div className="font-semibold">Ingen subprocess hittad</div>
                                                        <div className="text-muted-foreground">
                                                          Call Activity "{diff.node_name || diff.node_key}" kan inte mappas till en subprocess-fil.
                                                        </div>
                                                        {mappingInfo.calledElement && (
                                                          <div className="mt-1">
                                                            <span className="font-mono text-xs bg-muted px-1 rounded">
                                                              calledElement: {mappingInfo.calledElement}
                                                            </span>
                                                          </div>
                                                        )}
                                                      </div>
                                                    ) : mappingInfo.matchStatus === 'ambiguous' ? (
                                                      <div>
                                                        <div className="font-semibold">Tvetydig matchning</div>
                                                        <div className="text-muted-foreground">
                                                          Flera möjliga subprocesser hittades. Föreslagen: {mappingInfo.subprocess_bpmn_file}
                                                        </div>
                                                      </div>
                                                    ) : mappingInfo.matchStatus === 'unresolved' ? (
                                                      <div>
                                                        <div className="font-semibold">Ingen matchning</div>
                                                        <div className="text-muted-foreground">
                                                          Ingen subprocess kunde matchas automatiskt.
                                                        </div>
                                                      </div>
                                                    ) : null}
                                                    {mappingInfo.diagnostics && mappingInfo.diagnostics.length > 0 && (
                                                      <div className="mt-2 space-y-1">
                                                        {mappingInfo.diagnostics.map((diag, idx) => (
                                                          <div key={idx} className="text-xs">
                                                            <span className="font-semibold">{diag.code}:</span> {diag.message}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )}
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                      💡 Uppdatera bpmn-map.json för att koppla denna call activity till en subprocess-fil.
                                                    </div>
                                                  </AlertDescription>
                                                </Alert>
                                              );
                                            } else if (mappingInfo.subprocess_bpmn_file) {
                                              return (
                                                <div className="text-xs space-y-1">
                                                  <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                    <span className="font-semibold text-green-700">Mappad till:</span>
                                                    <span className="font-mono bg-green-50 px-1 rounded">
                                                      {mappingInfo.subprocess_bpmn_file}
                                                    </span>
                                                  </div>
                                                  {mappingInfo.matchSource && (
                                                    <div className="text-muted-foreground">
                                                      Källa: {mappingInfo.matchSource === 'bpmn-map' ? 'bpmn-map.json' : 'Automatisk matchning'}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </div>
                                      )}
                                      
                                      {/* Vanliga diff-detaljer */}
                                      {diff.diff_details && (
                                        <div className="text-sm">
                                          {Object.keys(diff.diff_details).map((key) => (
                                            <div key={key} className="text-muted-foreground">
                                              <strong>{key}:</strong> {String(diff.diff_details[key].old)} → {String(diff.diff_details[key].new)}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(diff.detected_at).toLocaleString('sv-SE')}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

