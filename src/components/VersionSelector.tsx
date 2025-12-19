/**
 * Version Selector Component
 * Allows users to select which version of BPMN files to work with across the app
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Clock, Hash, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAllVersions, getCurrentVersion, type BpmnFileVersion } from '@/lib/bpmnVersioning';
import { useBpmnFiles } from '@/hooks/useBpmnFiles';
import { formatDistanceToNow } from 'date-fns';

interface VersionSelectorProps {
  selectedFileName?: string | null; // If provided, shows versions for this specific file (overrides context)
  onVersionChange?: (versionHash: string | null, fileName: string | null) => void;
  className?: string;
  showFileSelector?: boolean; // If true, shows file selector even if selectedFileName is provided
}

export function VersionSelector({ selectedFileName: propSelectedFileName, onVersionChange, className, showFileSelector = true }: VersionSelectorProps) {
  const { data: files = [] } = useBpmnFiles();
  const [selectedVersionHash, setSelectedVersionHash] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(propSelectedFileName || null);
  
  // Update selectedFile when prop changes
  useEffect(() => {
    if (propSelectedFileName) {
      setSelectedFile(propSelectedFileName);
    }
  }, [propSelectedFileName]);

  // Get all versions for the selected file
  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ['bpmn-versions', selectedFile],
    queryFn: async () => {
      if (!selectedFile) return [];
      return await getAllVersions(selectedFile);
    },
    enabled: !!selectedFile,
  });

  // Get current version
  const { data: currentVersion } = useQuery({
    queryKey: ['bpmn-current-version', selectedFile],
    queryFn: async () => {
      if (!selectedFile) return null;
      return await getCurrentVersion(selectedFile);
    },
    enabled: !!selectedFile,
  });

  // Initialize with current version
  useEffect(() => {
    if (currentVersion && !selectedVersionHash) {
      setSelectedVersionHash(currentVersion.content_hash);
    }
  }, [currentVersion, selectedVersionHash]);

  // Update parent when version changes
  useEffect(() => {
    if (onVersionChange && selectedFile) {
      onVersionChange(selectedVersionHash, selectedFile);
    }
  }, [selectedVersionHash, selectedFile, onVersionChange]);

  // If no file is selected and showFileSelector is true, show file selector
  if (!selectedFile && files.length > 0 && showFileSelector) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Select
          value={selectedFile || ''}
          onValueChange={(value) => {
            setSelectedFile(value);
            setSelectedVersionHash(null); // Reset to current when file changes
          }}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Välj BPMN-fil för versionsval" />
          </SelectTrigger>
          <SelectContent>
            {files
              .filter((f) => f.file_type === 'bpmn')
              .map((file) => (
                <SelectItem key={file.file_name} value={file.file_name}>
                  {file.file_name.replace('.bpmn', '')}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (!selectedFile) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        Inga BPMN-filer tillgängliga
      </div>
    );
  }

  const selectedVersion = versions.find((v) => v.content_hash === selectedVersionHash);
  const isCurrentVersion = selectedVersionHash === currentVersion?.content_hash;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* File name badge */}
      <Badge variant="outline" className="text-xs">
        {selectedFile.replace('.bpmn', '')}
      </Badge>

      {/* Version selector */}
      <Select
        value={selectedVersionHash || ''}
        onValueChange={(value) => {
          setSelectedVersionHash(value);
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            {selectedVersion ? (
              <div className="flex items-center gap-2">
                <span>Version {selectedVersion.version_number}</span>
                {isCurrentVersion && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    Nuvarande
                  </Badge>
                )}
              </div>
            ) : (
              'Välj version...'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {versionsLoading ? (
            <div className="p-2 text-sm text-muted-foreground">Laddar versioner...</div>
          ) : versions.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">Inga versioner hittades</div>
          ) : (
            versions.map((version) => {
              const isCurrent = version.content_hash === currentVersion?.content_hash;
              return (
                <SelectItem key={version.content_hash} value={version.content_hash}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Version {version.version_number}</span>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          Nuvarande
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(version.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                    {version.change_summary && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {version.change_summary}
                      </div>
                    )}
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>

      {/* Status indicator */}
      {!isCurrentVersion && (
        <Badge variant="outline" className="text-xs border-amber-500 text-amber-700">
          <AlertCircle className="h-3 w-3 mr-1" />
          Äldre version
        </Badge>
      )}

      {/* Reset to current button */}
      {!isCurrentVersion && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (currentVersion) {
              setSelectedVersionHash(currentVersion.content_hash);
            }
          }}
          className="text-xs"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Återställ till nuvarande
        </Button>
      )}

      {/* Version details popover */}
      {selectedVersion && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Hash className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-2">Versionsinformation</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-medium">{selectedVersion.version_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Hash:</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {selectedVersion.content_hash.substring(0, 12)}...
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {new Date(selectedVersion.created_at).toLocaleString('sv-SE')}
                    </span>
                  </div>
                  {selectedVersion.change_summary && (
                    <div className="mt-2 pt-2 border-t">
                      <span className="text-muted-foreground text-xs">Ändring:</span>
                      <p className="text-sm mt-1">{selectedVersion.change_summary}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

