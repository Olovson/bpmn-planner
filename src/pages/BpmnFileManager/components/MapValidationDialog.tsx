import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

