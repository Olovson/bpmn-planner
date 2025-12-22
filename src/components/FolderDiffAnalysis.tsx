/**
 * FolderDiffAnalysis - Component for analyzing local folder diffs
 */

import { useState } from 'react';
import { FolderOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { analyzeFolderDiff, type FolderDiffResult } from '@/lib/bpmnDiffRegeneration';
import { DiffResultView } from './DiffResultView';
import { useToast } from '@/hooks/use-toast';

interface FolderDiffAnalysisProps {
  onFilesAnalyzed?: (result: FolderDiffResult) => void;
}

export function FolderDiffAnalysis({ onFilesAnalyzed }: FolderDiffAnalysisProps) {
  const [selectedFolder, setSelectedFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FolderDiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: '' });
  const { toast } = useToast();

  const handleSelectFolder = async () => {
    // Try to use the API - Brave may have it even if detection fails
    try {
      // Check if API exists
      if (!('showDirectoryPicker' in window)) {
        // Fallback: use file input with webkitdirectory
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        input.accept = '.bpmn';
        
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (!files || files.length === 0) return;
          
          // Convert FileList to array and filter for .bpmn files
          const bpmnFiles = Array.from(files).filter(f => f.name.endsWith('.bpmn'));
          
          if (bpmnFiles.length === 0) {
            toast({
              title: 'Inga BPMN-filer hittades',
              description: 'Inga .bpmn filer hittades i den valda mappen.',
              variant: 'destructive',
            });
            return;
          }
          
          // Process files (simplified - can't use File System Access API features)
          toast({
            title: 'Fallback-läge',
            description: `Hittade ${bpmnFiles.length} BPMN-filer. Fil System Access API är inte tillgängligt, så rekursiv sökning är begränsad.`,
          });
          
          // For now, just show a message - full implementation would require more work
          toast({
            title: 'Begränsad funktionalitet',
            description: 'File System Access API krävs för full funktionalitet. Använd Chrome, Edge eller Safari 15.2+ för bästa upplevelse.',
            variant: 'destructive',
          });
        };
        
        input.click();
        return;
      }

      // Use File System Access API
      const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
      setSelectedFolder(handle);
      setLoading(true);
      setAnalysisResult(null);
      
      const result = await analyzeFolderDiff(handle, {
        recursive: true,
        onProgress: (current, total, fileName) => {
          setProgress({ current, total, fileName });
        },
      });
      
      setAnalysisResult(result);
      onFilesAnalyzed?.(result);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled - don't show error
        return;
      }
      console.error('Error selecting folder:', error);
      
      // Check if it's a "not supported" error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNotSupported = errorMessage.includes('not supported') || 
                            errorMessage.includes('not defined') || 
                            errorMessage.includes('is not a function') ||
                            !('showDirectoryPicker' in window);
      
      if (isNotSupported) {
        // Show helpful message for Brave users
        toast({
          title: 'File System Access API krävs',
          description: 'Denna funktion kräver File System Access API. I Brave: Inaktivera Shields för localhost eller använd Chrome/Edge. API:et filtrerar automatiskt till .bpmn filer och stödjer rekursiv sökning.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Fel',
          description: errorMessage || 'Kunde inte välja mapp',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, fileName: '' });
    }
  };


  const filesWithChanges = analysisResult?.files.filter(f => f.hasChanges) || [];
  const filesWithoutChanges = analysisResult?.files.filter(f => !f.hasChanges) || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Analysera Lokal Mapp</CardTitle>
          <CardDescription>
            Välj en mapp med BPMN-filer för att analysera diffen mot befintliga filer i systemet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button
              onClick={handleSelectFolder}
              disabled={loading}
              className="w-full"
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              {loading ? 'Analyserar...' : 'Välj Mapp'}
            </Button>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Viktigt:</strong> Endast .bpmn filer analyseras och visas. 
                Andra filer i mappen ignoreras helt.
              </p>
              <p>
                <strong>Read-only analys:</strong> Filerna läses bara lokalt för diff-analys. 
                Inga filer laddas upp eller modifieras. För att ladda upp filer, använd "Filer"-sidan.
              </p>
            </div>
          </div>

          {loading && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Analyserar filer...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
              {progress.fileName && (
                <div className="text-xs text-muted-foreground">
                  {progress.fileName}
                </div>
              )}
            </div>
          )}

          {analysisResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Analysresultat</h3>
                  <p className="text-sm text-muted-foreground">
                    {analysisResult.totalFiles} filer hittade
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {analysisResult.totalChanges.added} tillagda
                  </Badge>
                  <Badge variant="destructive">
                    {analysisResult.totalChanges.removed} borttagna
                  </Badge>
                  <Badge variant="outline">
                    {analysisResult.totalChanges.modified} ändrade
                  </Badge>
                </div>
              </div>

              {filesWithChanges.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Filer med ändringar ({filesWithChanges.length})</h4>
                  <div className="space-y-2">
                    {filesWithChanges.map((fileInfo) => (
                      <div key={fileInfo.fileName}>
                        {fileInfo.diffResult ? (
                          <DiffResultView
                            diffResult={fileInfo.diffResult}
                            fileName={fileInfo.fileName}
                            compact
                            showUploadButton={false}
                          />
                        ) : (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base font-medium">
                                {fileInfo.fileName}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  {fileInfo.error || 'Kunde inte beräkna diff'}
                                </AlertDescription>
                              </Alert>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filesWithoutChanges.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Filer utan ändringar ({filesWithoutChanges.length})</h4>
                  <div className="text-sm text-muted-foreground">
                    {filesWithoutChanges.map(f => f.fileName).join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
