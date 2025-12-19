/**
 * BPMN Version History Page
 * 
 * Visar versionshistorik för en BPMN-fil med möjlighet att:
 * - Se alla versioner
 * - Se diff mellan versioner
 * - Återställa till tidigare version
 * - Se vilka artefakter som är kopplade till varje version
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  History, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  GitCompare,
  Calendar,
  Hash,
  User,
  Plus,
  Minus,
  Edit,
  Clock
} from 'lucide-react';
import { getAllVersions, getCurrentVersion, getVersionByHash, setVersionAsCurrent, type BpmnFileVersion } from '@/lib/bpmnVersioning';
import { formatDistanceToNow, format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useVersionSelection } from '@/hooks/useVersionSelection';

interface VersionDiff {
  fromVersion: BpmnFileVersion;
  toVersion: BpmnFileVersion;
  added: number;
  removed: number;
  modified: number;
}

export default function BpmnVersionHistoryPage() {
  const { fileName } = useParams<{ fileName: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { setSelection } = useVersionSelection();
  const [versions, setVersions] = useState<BpmnFileVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<BpmnFileVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDiff, setSelectedDiff] = useState<{ from: number; to: number } | null>(null);
  const [diffDetails, setDiffDetails] = useState<VersionDiff | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set());
  const [artifactCounts, setArtifactCounts] = useState<Map<string, { docs: number; tests: number }>>(new Map());
  const [comparisonMode, setComparisonMode] = useState<{ from: number; to: number } | null>(null);
  const [versionStats, setVersionStats] = useState<Map<string, { nodes: number; callActivities: number; tasks: number }>>(new Map());
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [editChangeSummary, setEditChangeSummary] = useState<string>('');

  useEffect(() => {
    if (fileName) {
      loadVersions();
    }
  }, [fileName]);

  const loadVersions = async () => {
    if (!fileName) return;
    
    try {
      setLoading(true);
      const [allVersions, current] = await Promise.all([
        getAllVersions(fileName),
        getCurrentVersion(fileName)
      ]);
      
      setVersions(allVersions);
      setCurrentVersion(current);
      
      // Load artifact counts and statistics for each version
      await Promise.all([
        loadArtifactCounts(allVersions),
        loadVersionStats(allVersions)
      ]);
    } catch (error) {
      console.error('Error loading versions:', error);
      toast({
        title: 'Fel vid laddning av versioner',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadArtifactCounts = async (versions: BpmnFileVersion[]) => {
    if (!fileName) return;
    
    const counts = new Map<string, { docs: number; tests: number }>();
    
    for (const version of versions) {
      try {
        // Check for docs in storage
        const docPaths = [
          `docs/slow/chatgpt/${fileName}/${version.content_hash}`,
          `docs/slow/ollama/${fileName}/${version.content_hash}`,
          `docs/local/${fileName}/${version.content_hash}`,
        ];
        
        let docCount = 0;
        let testCount = 0;
        
        for (const path of docPaths) {
          const { data: files, error } = await supabase.storage
            .from('bpmn-files')
            .list(path, { limit: 1000 });
          
          if (!error && files) {
            docCount += files.filter(f => f.name.endsWith('.html')).length;
          }
        }
        
        // Check for tests
        const testPaths = [
          `tests/slow/${fileName}`,
          `tests/local/${fileName}`,
        ];
        
        for (const path of testPaths) {
          const { data: files, error } = await supabase.storage
            .from('bpmn-files')
            .list(path, { limit: 1000 });
          
          if (!error && files) {
            testCount += files.filter(f => f.name.endsWith('.test.ts')).length;
          }
        }
        
        counts.set(version.content_hash, { docs: docCount, tests: testCount });
      } catch (error) {
        console.error(`Error loading artifacts for version ${version.version_number}:`, error);
        counts.set(version.content_hash, { docs: 0, tests: 0 });
      }
    }
    
    setArtifactCounts(counts);
  };

  const loadVersionStats = async (versions: BpmnFileVersion[]) => {
    if (!fileName) return;
    
    const stats = new Map<string, { nodes: number; callActivities: number; tasks: number }>();
    
    for (const version of versions) {
      try {
        // Parse metadata to get node counts
        if (version.meta && typeof version.meta === 'object') {
          const meta = version.meta as any;
          const nodes = meta.nodes?.length || 0;
          const callActivities = meta.callActivities?.length || 0;
          const tasks = meta.tasks?.length || 0;
          
          stats.set(version.content_hash, { nodes, callActivities, tasks });
        } else {
          stats.set(version.content_hash, { nodes: 0, callActivities: 0, tasks: 0 });
        }
      } catch (error) {
        console.error(`Error loading stats for version ${version.version_number}:`, error);
        stats.set(version.content_hash, { nodes: 0, callActivities: 0, tasks: 0 });
      }
    }
    
    setVersionStats(stats);
  };

  const handleEditChangeSummary = async (version: BpmnFileVersion) => {
    if (!fileName) return;
    
    try {
      const { error } = await supabase
        .from('bpmn_file_versions')
        .update({ change_summary: editChangeSummary })
        .eq('id', version.id);
      
      if (error) throw error;
      
      toast({
        title: 'Ändringssammanfattning uppdaterad',
        description: `Version ${version.version_number} har uppdaterats.`,
      });
      
      setEditingVersion(null);
      setEditChangeSummary('');
      await loadVersions();
    } catch (error) {
      console.error('Error updating change summary:', error);
      toast({
        title: 'Fel vid uppdatering',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    }
  };

  const loadDiff = async (fromVersionNumber: number, toVersionNumber: number) => {
    if (!fileName) return;
    
    try {
      setLoadingDiff(true);
      const fromVersion = versions.find(v => v.version_number === fromVersionNumber);
      const toVersion = versions.find(v => v.version_number === toVersionNumber);
      
      if (!fromVersion || !toVersion) {
        toast({
          title: 'Fel',
          description: 'Kunde inte hitta versioner för diff',
          variant: 'destructive',
        });
        return;
      }

      // Load diff from bpmn_file_diffs table
      const { data: diffs, error } = await supabase
        .from('bpmn_file_diffs')
        .select('*')
        .eq('file_name', fileName)
        .eq('from_version_number', fromVersionNumber)
        .eq('to_version_number', toVersionNumber)
        .is('resolved_at', null); // Only unresolved diffs

      if (error) {
        console.error('Error loading diff:', error);
        toast({
          title: 'Fel vid laddning av diff',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      const added = diffs?.filter(d => d.diff_type === 'added').length || 0;
      const removed = diffs?.filter(d => d.diff_type === 'removed').length || 0;
      const modified = diffs?.filter(d => d.diff_type === 'modified').length || 0;

      setDiffDetails({
        fromVersion,
        toVersion,
        added,
        removed,
        modified,
      });
    } catch (error) {
      console.error('Error loading diff:', error);
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleViewDiff = (fromVersionNumber: number, toVersionNumber: number) => {
    setSelectedDiff({ from: fromVersionNumber, to: toVersionNumber });
    setComparisonMode({ from: fromVersionNumber, to: toVersionNumber });
    loadDiff(fromVersionNumber, toVersionNumber);
  };

  const handleRestoreVersion = async (version: BpmnFileVersion) => {
    if (!fileName) return;
    
    if (!confirm(`Vill du återställa till version ${version.version_number}? Detta kommer att skapa en ny version med samma innehåll.`)) {
      return;
    }

    try {
      // Set this version as current
      await setVersionAsCurrent(fileName, version.content_hash);
      
      // Update global version selection
      const { setSelection } = useVersionSelection();
      setSelection({
        selectedVersionHash: version.content_hash,
        selectedFileName: fileName,
      });

      toast({
        title: 'Version återställd',
        description: `Version ${version.version_number} är nu aktuell.`,
      });

      // Reload versions
      await loadVersions();
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: 'Fel vid återställning',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    }
  };

  const toggleVersionExpanded = (versionNumber: number) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(versionNumber)) {
        next.delete(versionNumber);
      } else {
        next.add(versionNumber);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background overflow-hidden pl-16">
        <AppHeaderWithTabs
          userEmail={user?.email ?? ''}
          currentView="files"
          onViewChange={() => {}}
          onOpenVersions={() => {}}
          onSignOut={async () => {
            await signOut();
            navigate('/auth');
          }}
        />
        <main className="flex-1 min-w-0 overflow-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Laddar versionshistorik...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!fileName || versions.length === 0) {
    return (
      <div className="flex min-h-screen bg-background overflow-hidden pl-16">
        <AppHeaderWithTabs
          userEmail={user?.email ?? ''}
          currentView="files"
          onViewChange={() => {}}
          onOpenVersions={() => {}}
          onSignOut={async () => {
            await signOut();
            navigate('/auth');
          }}
        />
        <main className="flex-1 min-w-0 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <Button variant="ghost" onClick={() => navigate('/files')} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka till filer
            </Button>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {!fileName ? 'Ingen fil angiven' : 'Inga versioner hittades för denna fil'}
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? ''}
        currentView="files"
        onViewChange={(view) => {
          if (view === 'files') navigate('/files');
          else if (view === 'diagram') navigate('/');
          else if (view === 'tree') navigate('/process-explorer');
          else navigate('/files');
        }}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
      />

      <main className="flex-1 min-w-0 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" onClick={() => navigate('/files')} size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka till filer
              </Button>
              <span className="text-muted-foreground">/</span>
              <Button variant="ghost" onClick={() => navigate('/files')} size="sm">
                Filer
              </Button>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">{fileName?.replace('.bpmn', '')}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">Versionshistorik</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <History className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">Versionshistorik</h1>
            </div>
            <p className="text-muted-foreground">
              {fileName} · {versions.length} version{versions.length !== 1 ? 'er' : ''}
            </p>
            
            {/* Comparison mode toggle */}
            {versions.length > 1 && (
              <div className="mt-4">
                <Button
                  variant={comparisonMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (comparisonMode) {
                      setComparisonMode(null);
                    } else {
                      // Set default comparison (oldest vs newest)
                      setComparisonMode({
                        from: versions[versions.length - 1].version_number,
                        to: versions[0].version_number
                      });
                    }
                  }}
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  {comparisonMode ? 'Avsluta jämförelse' : 'Jämför versioner'}
                </Button>
              </div>
            )}
          </div>

          {/* Versions list */}
          <div className="space-y-4">
            {versions.map((version, index) => {
              const isCurrent = version.content_hash === currentVersion?.content_hash;
              const isExpanded = expandedVersions.has(version.version_number);
              const previousVersion = index < versions.length - 1 ? versions[index + 1] : null;
              const nextVersion = index > 0 ? versions[index - 1] : null;

              return (
                <Card key={version.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={isCurrent ? 'default' : 'secondary'}>
                          Version {version.version_number}
                          {isCurrent && (
                            <CheckCircle2 className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="outline">Nuvarande</Badge>
                        )}
                        {editingVersion === version.version_number ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editChangeSummary}
                              onChange={(e) => setEditChangeSummary(e.target.value)}
                              placeholder="Beskriv ändringar..."
                              className="text-sm px-2 py-1 border rounded flex-1 max-w-md"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditChangeSummary(version);
                                } else if (e.key === 'Escape') {
                                  setEditingVersion(null);
                                  setEditChangeSummary('');
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleEditChangeSummary(version)}
                            >
                              Spara
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingVersion(null);
                                setEditChangeSummary('');
                              }}
                            >
                              Avbryt
                            </Button>
                          </div>
                        ) : (
                          <>
                            {version.change_summary ? (
                              <span className="text-sm text-muted-foreground">
                                {version.change_summary}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">
                                Ingen beskrivning
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => {
                                setEditingVersion(version.version_number);
                                setEditChangeSummary(version.change_summary || '');
                              }}
                              title="Redigera beskrivning"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(version.created_at), 'yyyy-MM-dd HH:mm', { locale: sv })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatDistanceToNow(new Date(version.created_at), { addSuffix: true, locale: sv })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          <span className="font-mono text-xs">{version.content_hash.substring(0, 8)}...</span>
                        </div>
                        {version.uploaded_by && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Användare</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Version statistics */}
                      {versionStats.has(version.content_hash) && (
                        <div className="flex gap-2 text-xs text-muted-foreground mb-3">
                          {(() => {
                            const stats = versionStats.get(version.content_hash)!;
                            return (
                              <>
                                {stats.nodes > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    📊 {stats.nodes} noder
                                  </Badge>
                                )}
                                {stats.callActivities > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    🔗 {stats.callActivities} subprocesser
                                  </Badge>
                                )}
                                {stats.tasks > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    ✓ {stats.tasks} tasks
                                  </Badge>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                      
                      {/* Artifact counts */}
                      {artifactCounts.has(version.content_hash) && (
                        <div className="flex items-center gap-2 text-xs mb-3">
                          {(() => {
                            const counts = artifactCounts.get(version.content_hash)!;
                            const hasArtifacts = counts.docs > 0 || counts.tests > 0;
                            const isOutdated = !isCurrent && hasArtifacts;
                            
                            return (
                              <>
                                {counts.docs > 0 && (
                                  <Badge variant={isOutdated ? "secondary" : "outline"} className="text-xs">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {counts.docs} dok
                                  </Badge>
                                )}
                                {counts.tests > 0 && (
                                  <Badge variant={isOutdated ? "secondary" : "outline"} className="text-xs">
                                    🧪 {counts.tests} tester
                                  </Badge>
                                )}
                                {!hasArtifacts && (
                                  <span className="text-muted-foreground">Inga artefakter genererade</span>
                                )}
                                {isOutdated && (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Äldre version
                                  </Badge>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {comparisonMode && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant={comparisonMode.from === version.version_number ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setComparisonMode(prev => prev ? { ...prev, from: version.version_number } : null);
                              }}
                            >
                              Från
                            </Button>
                            <Button
                              variant={comparisonMode.to === version.version_number ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setComparisonMode(prev => prev ? { ...prev, to: version.version_number } : null);
                              }}
                            >
                              Till
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          {previousVersion && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDiff(previousVersion.version_number, version.version_number)}
                              disabled={loadingDiff}
                              title={`Jämför med version ${previousVersion.version_number}`}
                            >
                              <ArrowLeft className="h-4 w-4 mr-1" />
                              v{previousVersion.version_number}
                            </Button>
                          )}
                          {nextVersion && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDiff(version.version_number, nextVersion.version_number)}
                              disabled={loadingDiff}
                              title={`Jämför med version ${nextVersion.version_number}`}
                            >
                              v{nextVersion.version_number}
                              <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                            </Button>
                          )}
                        </div>
                        {previousVersion && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDiff(previousVersion.version_number, version.version_number)}
                            disabled={loadingDiff}
                          >
                            <GitCompare className="h-4 w-4 mr-2" />
                            Visa diff från v{previousVersion.version_number}
                          </Button>
                        )}
                        {!isCurrent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreVersion(version)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Återställ till denna version
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Diff details */}
                  {selectedDiff?.from === previousVersion?.version_number && selectedDiff?.to === version.version_number && diffDetails && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">Ändringar från v{diffDetails.fromVersion.version_number} till v{diffDetails.toVersion.version_number}</h4>
                      <div className="flex gap-4 text-sm">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Plus className="h-3 w-3 mr-1" />
                          {diffDetails.added} tillagda
                        </Badge>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <Minus className="h-3 w-3 mr-1" />
                          {diffDetails.removed} borttagna
                        </Badge>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <Edit className="h-3 w-3 mr-1" />
                          {diffDetails.modified} ändrade
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/bpmn-diff?file=${fileName}&from=${diffDetails.fromVersion.version_number}&to=${diffDetails.toVersion.version_number}`)}
                        >
                          Visa detaljerad diff →
                        </Button>
                        {(diffDetails.added > 0 || diffDetails.modified > 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to files page and trigger generation for this file
                              navigate(`/files?file=${fileName}&regenerate=true`);
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Regenerera artefakter
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          
          {/* Comparison view */}
          {comparisonMode && (() => {
            const fromVersion = versions.find(v => v.version_number === comparisonMode.from);
            const toVersion = versions.find(v => v.version_number === comparisonMode.to);
            
            if (!fromVersion || !toVersion) return null;
            
            // Auto-load diff if not already loaded
            if (!diffDetails || diffDetails.fromVersion.version_number !== fromVersion.version_number || diffDetails.toVersion.version_number !== toVersion.version_number) {
              loadDiff(fromVersion.version_number, toVersion.version_number);
            }
            
            return (
              <Card className="mt-6 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Jämförelse: v{fromVersion.version_number} → v{toVersion.version_number}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleViewDiff(fromVersion.version_number, toVersion.version_number);
                    }}
                  >
                    <GitCompare className="h-4 w-4 mr-2" />
                    Visa detaljerad diff
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Version {fromVersion.version_number}</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Datum: {format(new Date(fromVersion.created_at), 'yyyy-MM-dd HH:mm', { locale: sv })}</p>
                      {versionStats.has(fromVersion.content_hash) && (() => {
                        const stats = versionStats.get(fromVersion.content_hash)!;
                        return (
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{stats.nodes} noder</Badge>
                            <Badge variant="outline" className="text-xs">{stats.callActivities} subprocesser</Badge>
                          </div>
                        );
                      })()}
                      {artifactCounts.has(fromVersion.content_hash) && (() => {
                        const counts = artifactCounts.get(fromVersion.content_hash)!;
                        return (
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{counts.docs} dok</Badge>
                            <Badge variant="outline" className="text-xs">{counts.tests} tester</Badge>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Version {toVersion.version_number}</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Datum: {format(new Date(toVersion.created_at), 'yyyy-MM-dd HH:mm', { locale: sv })}</p>
                      {versionStats.has(toVersion.content_hash) && (() => {
                        const stats = versionStats.get(toVersion.content_hash)!;
                        return (
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{stats.nodes} noder</Badge>
                            <Badge variant="outline" className="text-xs">{stats.callActivities} subprocesser</Badge>
                          </div>
                        );
                      })()}
                      {artifactCounts.has(toVersion.content_hash) && (() => {
                        const counts = artifactCounts.get(toVersion.content_hash)!;
                        return (
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{counts.docs} dok</Badge>
                            <Badge variant="outline" className="text-xs">{counts.tests} tester</Badge>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                
                {diffDetails && diffDetails.fromVersion.version_number === fromVersion.version_number && diffDetails.toVersion.version_number === toVersion.version_number && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-2">Ändringar</h4>
                    <div className="flex gap-4 text-sm">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Plus className="h-3 w-3 mr-1" />
                        {diffDetails.added} tillagda
                      </Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <Minus className="h-3 w-3 mr-1" />
                        {diffDetails.removed} borttagna
                      </Badge>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        <Edit className="h-3 w-3 mr-1" />
                        {diffDetails.modified} ändrade
                      </Badge>
                    </div>
                  </div>
                )}
              </Card>
            );
          })()}
        </div>
      </main>
    </div>
  );
}

