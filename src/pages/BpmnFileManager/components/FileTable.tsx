import { FileText, AlertCircle, GitBranch, Sparkles, Download, Trash2, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArtifactStatusBadge } from '@/components/ArtifactStatusBadge';
import type { BpmnFile } from '@/hooks/useBpmnFiles';
import type { ArtifactCoverageMap } from '@/hooks/useFileArtifactCoverage';
import type { LlmGenerationMode } from '@/lib/llmMode';

// Helper functions
const formatBytes = (bytes: number | null) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDuration = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
};

export interface FileTableProps {
  files: BpmnFile[];
  selectedFile: BpmnFile | null;
  onSelectFile: (file: BpmnFile) => void;
  isLoading: boolean;
  fileFilter: 'all' | 'bpmn' | 'dmn';
  onFilterChange: (filter: 'all' | 'bpmn' | 'dmn') => void;
  fileSortBy: {
    column: 'name' | 'size' | 'updated' | 'artifacts';
    direction: 'asc' | 'desc';
  };
  onSortChange: (sort: {
    column: 'name' | 'size' | 'updated' | 'artifacts';
    direction: 'asc' | 'desc';
  }) => void;
  coverageMap?: ArtifactCoverageMap;
  artifactStatusByFile: Map<string, {
    doc: { status: string; generatedAt?: string; durationMs?: number; outdated?: boolean; mode?: string; llmProvider?: string };
    test: { status: string; generatedAt?: string; outdated?: boolean; mode?: string; llmProvider?: string };
  }>;
  generatingFile: string | null;
  generationMode: LlmGenerationMode;
  onBuildHierarchy: (file: BpmnFile) => Promise<void>;
  onGenerateArtifacts: (file: BpmnFile, mode: LlmGenerationMode, scope: 'file' | 'node') => Promise<void>;
  onDownload: (file: BpmnFile) => Promise<void>;
  onDelete: (file: BpmnFile) => void;
}

export function FileTable({
  files,
  selectedFile,
  onSelectFile,
  isLoading,
  fileFilter,
  onFilterChange,
  fileSortBy,
  onSortChange,
  coverageMap,
  artifactStatusByFile,
  generatingFile,
  generationMode,
  onBuildHierarchy,
  onGenerateArtifacts,
  onDownload,
  onDelete,
}: FileTableProps) {
  // Filter and sort files
  let filteredFiles = files.filter(f => fileFilter === 'all' || f.file_type === fileFilter);
  
  filteredFiles = [...filteredFiles].sort((a, b) => {
    let comparison = 0;
    
    switch (fileSortBy.column) {
      case 'name':
        comparison = a.file_name.localeCompare(b.file_name);
        break;
      case 'size':
        comparison = (a.size_bytes || 0) - (b.size_bytes || 0);
        break;
      case 'updated':
        comparison = new Date(a.last_updated_at).getTime() - new Date(b.last_updated_at).getTime();
        break;
      case 'artifacts': {
        // Sortera efter antal dokumentation + tester
        const aCoverage = coverageMap?.get(a.file_name);
        const bCoverage = coverageMap?.get(b.file_name);
        const aTotal = (aCoverage?.docs.covered || 0) + (aCoverage?.tests.covered || 0);
        const bTotal = (bCoverage?.docs.covered || 0) + (bCoverage?.tests.covered || 0);
        comparison = aTotal - bTotal;
        break;
      }
      default:
        return 0;
    }
    
    // Applicera sorteringsriktning
    return fileSortBy.direction === 'asc' ? comparison : -comparison;
  });

  return (
    <Card className="mt-4">
      {/* Filter and Sort Controls */}
      {files.length > 0 && (
        <div className="p-4 border-b flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtrera:</span>
            <Select value={fileFilter} onValueChange={onFilterChange}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla filer</SelectItem>
                <SelectItem value="bpmn">BPMN</SelectItem>
                <SelectItem value="dmn">DMN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            Visar {filteredFiles.length} av {files.length} filer
          </div>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => {
                onSortChange({
                  column: 'name',
                  direction: fileSortBy.column === 'name' && fileSortBy.direction === 'asc' ? 'desc' : 'asc'
                });
              }}
            >
              <div className="flex items-center gap-2">
                Filnamn
                {fileSortBy.column === 'name' && (
                  fileSortBy.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                )}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => {
                onSortChange({
                  column: 'size',
                  direction: fileSortBy.column === 'size' && fileSortBy.direction === 'asc' ? 'desc' : 'asc'
                });
              }}
            >
              <div className="flex items-center gap-2">
                Storlek
                {fileSortBy.column === 'size' && (
                  fileSortBy.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                )}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => {
                onSortChange({
                  column: 'updated',
                  direction: fileSortBy.column === 'updated' && fileSortBy.direction === 'asc' ? 'desc' : 'asc'
                });
              }}
            >
              <div className="flex items-center gap-2">
                Senast uppdaterad
                {fileSortBy.column === 'updated' && (
                  fileSortBy.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                )}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => {
                onSortChange({
                  column: 'artifacts',
                  direction: fileSortBy.column === 'artifacts' && fileSortBy.direction === 'asc' ? 'desc' : 'asc'
                });
              }}
            >
              <div className="flex items-center gap-2">
                Struktur & artefakter
                {fileSortBy.column === 'artifacts' && (
                  fileSortBy.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                )}
              </div>
            </TableHead>
            <TableHead className="text-right">Åtgärder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                Laddar filer...
              </TableCell>
            </TableRow>
          ) : files.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Inga filer uppladdade ännu
              </TableCell>
            </TableRow>
          ) : (
            filteredFiles.map((file) => {
              const isSelected = selectedFile?.id === file.id;
              return (
                <TableRow
                  key={file.id}
                  className={
                    isSelected
                      ? 'bg-muted/60 border-l-4 border-primary/70'
                      : 'hover:bg-muted/30 cursor-pointer'
                  }
                  onClick={() => onSelectFile(file)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {file.file_name}
                      {file.has_structure_changes && (
                        <div className="relative group">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border z-50">
                            ⚠️ Nya subprocess-filer har upptäckts som påverkar denna process. 
                            Generera om artefakter för att inkludera dem.
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatBytes(file.size_bytes)}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(file.last_updated_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {file.file_type === 'bpmn' && coverageMap?.get(file.file_name) ? (
                        <>
                          <ArtifactStatusBadge
                            icon="📄"
                            label="Dok"
                            status={coverageMap.get(file.file_name)!.docs.status}
                            covered={coverageMap.get(file.file_name)!.docs.covered}
                            total={coverageMap.get(file.file_name)!.docs.total}
                            title={(() => {
                              const summary = artifactStatusByFile.get(file.file_name);
                              if (!summary) return undefined;
                              const snap = summary.doc;
                              if (snap.status === 'missing') {
                                return 'Ingen dokumentation genererad ännu.';
                              }
                              const providerLabel =
                                (snap as any).llmProvider === 'cloud'
                                  ? 'Claude'
                                  : (snap as any).llmProvider === 'local'
                                  ? 'Ollama'
                                  : undefined;
                              const modeLabel =
                                snap.mode === 'slow'
                                  ? providerLabel
                                    ? `LLM (${providerLabel})`
                                    : 'Slow LLM'
                                  : 'Okänt läge';
                              const timeStr = snap.generatedAt
                                ? new Date(snap.generatedAt).toLocaleString('sv-SE')
                                : '';
                              const durationText =
                                snap.durationMs !== undefined && snap.durationMs > 0
                                  ? ` · Körtid: ${formatDuration(snap.durationMs)}`
                                  : '';
                              const outdatedText = snap.outdated
                                ? ' (inaktuell – BPMN har ändrats efter generering)'
                                : '';
                              return `Dokumentation: ${modeLabel}${
                                timeStr ? ` · ${timeStr}` : ''
                              }${durationText}${outdatedText}`;
                            })()}
                          />
                          <ArtifactStatusBadge
                            icon="🧪"
                            label="Test"
                            status={coverageMap.get(file.file_name)!.tests.status}
                            covered={coverageMap.get(file.file_name)!.tests.covered}
                            total={coverageMap.get(file.file_name)!.tests.total}
                            title={(() => {
                              const summary = artifactStatusByFile.get(file.file_name);
                              if (!summary) return undefined;
                              const snap = summary.test;
                              if (snap.status === 'missing') {
                                return 'Inga tester genererade ännu.';
                              }
                              const providerLabel =
                                (snap as any).llmProvider === 'cloud'
                                  ? 'Claude'
                                  : (snap as any).llmProvider === 'local'
                                  ? 'Ollama'
                                  : undefined;
                              const modeLabel =
                                snap.mode === 'slow'
                                  ? providerLabel
                                    ? `LLM (${providerLabel})`
                                    : 'Slow LLM'
                                  : 'Okänt läge';
                              const timeStr = snap.generatedAt
                                ? new Date(snap.generatedAt).toLocaleString('sv-SE')
                                : '';
                              const outdatedText = snap.outdated ? ' (inaktuella – BPMN har ändrats efter generering)' : '';
                              return `Tester: ${modeLabel}${timeStr ? ` · ${timeStr}` : ''}${outdatedText}`;
                            })()}
                          />
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {file.file_type === 'dmn' ? 'DMN-filer stöds ej' : 'Laddar...'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {file.file_type === 'bpmn' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onBuildHierarchy(file);
                          }}
                          disabled={generatingFile !== null || isLoading}
                          title="Bygg/uppdatera hierarki för denna fil"
                        >
                          <GitBranch className="w-4 h-4" />
                          <span className="hidden sm:inline">Hierarki</span>
                        </Button>
                      )}
                      {file.file_type === 'bpmn' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onGenerateArtifacts(file, generationMode, 'file');
                          }}
                          disabled={generatingFile !== null || isLoading}
                          title="Generera dokumentation för denna fil (testgenerering sker i separat steg)"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1">Dokumentation</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onDownload(file);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(file);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

