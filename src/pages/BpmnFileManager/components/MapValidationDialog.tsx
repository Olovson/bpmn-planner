import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useState } from 'react';

interface MapValidationResult {
  summary: {
    unmapped_call_activities: number;
    call_activities_missing_in_map: number;
    missing_subprocess_files: number;
    map_inconsistencies: number;
    orphan_processes: number;
  };
  unmapped_call_activities: Array<{ bpmn_file: string; bpmn_id: string; name: string }>;
  call_activities_missing_in_map: Array<{ bpmn_file: string; bpmn_id: string; name: string }>;
  missing_subprocess_files: Array<{ bpmn_file: string; bpmn_id: string; subprocess_bpmn_file: string }>;
  orphan_processes: Array<{ bpmn_file: string; hint: string }>;
  currentMap?: {
    processes: Array<{
      bpmn_file: string;
      process_id: string;
      alias?: string;
      call_activities: Array<{
        bpmn_id: string;
        name?: string;
        subprocess_bpmn_file?: string;
      }>;
    }>;
  };
}

interface MapValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapValidationResult: MapValidationResult | null;
}

export function MapValidationDialog({
  open,
  onOpenChange,
  mapValidationResult,
}: MapValidationDialogProps) {
  const [showCurrentMap, setShowCurrentMap] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const handleExportMap = () => {
    if (!mapValidationResult?.currentMap) return;
    const jsonStr = JSON.stringify(mapValidationResult.currentMap, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bpmn-map-current.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>BPMN-kartvalidering</DialogTitle>
          <DialogDescription>
            Jämförelse mellan bpmn-map.json och aktuella BPMN-filer. Använd detta som checklista för att fylla i saknade subprocess-kopplingar.
          </DialogDescription>
        </DialogHeader>
        {mapValidationResult && (
          <div className="mt-4 space-y-6 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="rounded-md border bg-muted/60 p-2">
                <p className="text-xs text-muted-foreground">Omatchade call activities</p>
                <p className="font-semibold">
                  {mapValidationResult.summary.unmapped_call_activities}
                </p>
              </div>
              <div className="rounded-md border bg-muted/60 p-2">
                <p className="text-xs text-muted-foreground">Saknas i map</p>
                <p className="font-semibold">
                  {mapValidationResult.summary.call_activities_missing_in_map}
                </p>
              </div>
              <div className="rounded-md border bg-muted/60 p-2">
                <p className="text-xs text-muted-foreground">Saknade subprocess-filer</p>
                <p className="font-semibold">
                  {mapValidationResult.summary.missing_subprocess_files}
                </p>
              </div>
              <div className="rounded-md border bg-muted/60 p-2">
                <p className="text-xs text-muted-foreground">Map-inkonsekvenser</p>
                <p className="font-semibold">
                  {mapValidationResult.summary.map_inconsistencies}
                </p>
              </div>
              <div className="rounded-md border bg-muted/60 p-2">
                <p className="text-xs text-muted-foreground">Orphan-processer</p>
                <p className="font-semibold">
                  {mapValidationResult.summary.orphan_processes}
                </p>
              </div>
            </div>

            {mapValidationResult.unmapped_call_activities.length > 0 && (
              <div>
                <p className="font-medium mb-1">Call activities utan subprocess_bpmn_file:</p>
                <ul className="space-y-1">
                  {mapValidationResult.unmapped_call_activities.slice(0, 20).map((item, idx) => (
                    <li key={`unmapped-${idx}`} className="text-xs text-muted-foreground">
                      <code>{item.bpmn_file}</code> · <code>{item.bpmn_id}</code> – {item.name}
                    </li>
                  ))}
                  {mapValidationResult.unmapped_call_activities.length > 20 && (
                    <li className="text-xs text-muted-foreground">
                      …och {mapValidationResult.unmapped_call_activities.length - 20} till
                    </li>
                  )}
                </ul>
              </div>
            )}

            {mapValidationResult.call_activities_missing_in_map.length > 0 && (
              <div>
                <p className="font-medium mb-1">Call activities som finns i BPMN men saknas i bpmn-map.json:</p>
                <ul className="space-y-1">
                  {mapValidationResult.call_activities_missing_in_map.slice(0, 20).map((item, idx) => (
                    <li key={`missing-${idx}`} className="text-xs text-muted-foreground">
                      <code>{item.bpmn_file}</code> · <code>{item.bpmn_id}</code> – {item.name}
                    </li>
                  ))}
                  {mapValidationResult.call_activities_missing_in_map.length > 20 && (
                    <li className="text-xs text-muted-foreground">
                      …och {mapValidationResult.call_activities_missing_in_map.length - 20} till
                    </li>
                  )}
                </ul>
              </div>
            )}

            {mapValidationResult.missing_subprocess_files.length > 0 && (
              <div>
                <p className="font-medium mb-1">Subprocess-filer som anges i map men saknas i registret:</p>
                <ul className="space-y-1">
                  {mapValidationResult.missing_subprocess_files.map((item, idx) => (
                    <li key={`miss-sub-${idx}`} className="text-xs text-muted-foreground">
                      <code>{item.bpmn_file}</code> · <code>{item.bpmn_id}</code> →{' '}
                      <code>{item.subprocess_bpmn_file}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mapValidationResult.orphan_processes.length > 0 && (
              <div>
                <p className="font-medium mb-1">Orphan-processer:</p>
                <ul className="space-y-1">
                  {mapValidationResult.orphan_processes.map((item, idx) => (
                    <li key={`orphan-${idx}`} className="text-xs text-muted-foreground">
                      <code>{item.bpmn_file}</code> – {item.hint}
                      {item.bpmn_file === 'mortgage.bpmn' && (
                        <span className="ml-2 text-xs text-blue-600">(Detta är root-filen och är normalt)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Visa aktuell mappning */}
            {mapValidationResult.currentMap && (
              <div className="border-t pt-4">
                <Collapsible open={showCurrentMap} onOpenChange={setShowCurrentMap}>
                  <div className="flex items-center justify-between mb-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="p-0 h-auto font-medium">
                        {showCurrentMap ? (
                          <ChevronUp className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        )}
                        Aktuell mappning i bpmn-map.json ({mapValidationResult.currentMap.processes.length} processer)
                      </Button>
                    </CollapsibleTrigger>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportMap}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportera
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <div className="space-y-3 mt-2">
                      {mapValidationResult.currentMap.processes.map((proc) => {
                        const isExpanded = expandedFiles.has(proc.bpmn_file);
                        const hasCallActivities = proc.call_activities && proc.call_activities.length > 0;
                        return (
                          <div key={proc.bpmn_file} className="border rounded-lg p-3 bg-muted/30">
                            <Collapsible
                              open={isExpanded}
                              onOpenChange={(open) => {
                                const newSet = new Set(expandedFiles);
                                if (open) {
                                  newSet.add(proc.bpmn_file);
                                } else {
                                  newSet.delete(proc.bpmn_file);
                                }
                                setExpandedFiles(newSet);
                              }}
                            >
                              <CollapsibleTrigger asChild>
                                <button className="w-full text-left flex items-center justify-between">
                                  <div>
                                    <code className="text-xs font-mono bg-background px-1 rounded">{proc.bpmn_file}</code>
                                    {proc.alias && (
                                      <span className="ml-2 text-xs text-muted-foreground">({proc.alias})</span>
                                    )}
                                    {hasCallActivities && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        · {proc.call_activities.length} call activit{proc.call_activities.length === 1 ? 'y' : 'ies'}
                                      </span>
                                    )}
                                  </div>
                                  {hasCallActivities && (
                                    isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )
                                  )}
                                </button>
                              </CollapsibleTrigger>
                              {hasCallActivities && (
                                <CollapsibleContent>
                                  <div className="mt-2 space-y-1 pl-4 border-l-2 border-muted">
                                    {proc.call_activities.map((ca, idx) => (
                                      <div key={idx} className="text-xs py-1">
                                        <code className="font-mono bg-background px-1 rounded">{ca.bpmn_id}</code>
                                        {ca.name && <span className="ml-2 text-muted-foreground">– {ca.name}</span>}
                                        {ca.subprocess_bpmn_file ? (
                                          <span className="ml-2">
                                            → <code className="font-mono bg-background px-1 rounded text-green-600">{ca.subprocess_bpmn_file}</code>
                                          </span>
                                        ) : (
                                          <span className="ml-2 text-orange-600">(saknar mappning)</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              )}
                            </Collapsible>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

