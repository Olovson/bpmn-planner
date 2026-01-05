import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import type { BpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import {
  buildBpmnMappingOverview,
  type BpmnMappingRow,
} from '@/lib/bpmn/bpmnMappingOverview';
import { invalidateStructureQueries } from '@/lib/queryInvalidation';

interface BpmnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BpmnMappingDialog({ open, onOpenChange }: BpmnMappingDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [map, setMap] = useState<BpmnMap | null>(null);
  const [rows, setRows] = useState<BpmnMappingRow[]>([]);
  const [subprocessCandidates, setSubprocessCandidates] = useState<string[]>([]);

  const summary = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter((r) => r.status === 'ok').length;
    const unclearOrMissing = total - ok;
    return { total, ok, unclearOrMissing };
  }, [rows]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('bpmn_files')
        .select('file_name, storage_path, meta')
        .eq('file_type', 'bpmn');

      if (error) {
        throw error;
      }

      const files =
        data?.map((f: any) => ({
          file_name: f.file_name as string,
          storage_path: (f.storage_path as string) ?? null,
          meta: (f.meta as any) ?? null,
        })) ?? [];

      const { loadBpmnMapFromStorageSimple } = await import(
        '@/lib/bpmn/bpmnMapStorage'
      );
      const currentMap = await loadBpmnMapFromStorageSimple();

      const overview = buildBpmnMappingOverview(currentMap, files);

      setMap(currentMap);
      setRows(overview.rows);
      setSubprocessCandidates(overview.subprocessCandidates);
    } catch (e: any) {
      console.error('[BpmnMappingDialog] Failed to load mapping overview:', e);
      setError(
        e?.message ??
          'Kunde inte ladda BPMN‑filer eller bpmn‑map.json. Se konsollen för detaljer.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadData();
    }
  }, [open]);

  const updateRowSubprocess = (rowId: string, subprocessFile: string | null) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              subprocessFile,
              status: subprocessFile ? 'ok' : 'missing',
            }
          : r,
      ),
    );
  };

  const handleSave = async () => {
    if (!map) return;
    try {
      setSaving(true);
      setError(null);

      const updatedMap: BpmnMap = {
        ...map,
        processes: map.processes.map((proc) => {
          const procRows = rows.filter((r) => r.bpmnFile === proc.bpmn_file && r.processId === proc.process_id);
          if (procRows.length === 0) {
            return proc;
          }

          const existing = proc.call_activities ?? [];
          const byId = new Map(existing.map((ca) => [ca.bpmn_id, ca]));

          for (const row of procRows) {
            const existingCa = byId.get(row.callActivityId);
            const base = existingCa ?? {
              bpmn_id: row.callActivityId,
            };
            byId.set(row.callActivityId, {
              ...base,
              name: row.callActivityName ?? base.name,
              called_element: row.calledElement ?? base.called_element ?? null,
              subprocess_bpmn_file: row.subprocessFile,
              match_status: row.subprocessFile ? 'matched' : 'unresolved',
              needs_manual_review: !row.subprocessFile,
              source: existingCa?.source ?? 'manual',
            } as any);
          }

          return {
            ...proc,
            call_activities: Array.from(byId.values()),
          };
        }),
        generated_at: new Date().toISOString(),
      };

      const { saveBpmnMapToStorage } = await import('@/lib/bpmn/bpmnMapStorage');
      const result = await saveBpmnMapToStorage(updatedMap);

      if (!result.success) {
        throw new Error(result.error || 'Okänt fel vid sparande av bpmn-map.json');
      }

      setMap(updatedMap);

      // Invalidera struktur-relaterade queries så att övriga vyer ser uppdaterad karta
      invalidateStructureQueries(queryClient);

      // Ladda om vy så att dialogen speglar uppdaterad mappning
      void loadData();
    } catch (e: any) {
      console.error('[BpmnMappingDialog] Failed to save mapping:', e);
      setError(
        e?.message ??
          'Kunde inte spara uppdaterad bpmn‑map.json. Se konsollen för detaljer.',
      );
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: BpmnMappingRow['status']) => {
    switch (status) {
      case 'ok':
        return (
          <Badge variant="outline" className="border-green-500 text-green-700">
            OK
          </Badge>
        );
      case 'unclear':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
            Otydlig
          </Badge>
        );
      case 'missing':
      default:
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-700">
            Saknas
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>BPMN‑mappning: Call Activities → subprocesser</DialogTitle>
          <DialogDescription>
            Detaljerad översikt över hur call activities i uppladdade BPMN‑filer är kopplade till subprocess‑filer.
            Använd denna vy när du vill granska eller justera mappningar i större skala.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="space-y-1 text-sm">
                <div>
                  Call activities totalt: <strong>{summary.total}</strong>
                </div>
                <div>
                  Klara mappningar:{' '}
                  <strong className="text-green-700">{summary.ok}</strong> ·
                  Otydliga eller saknas:{' '}
                  <strong className="text-orange-700">
                    {summary.unclearOrMissing}
                  </strong>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => void loadData()}
                >
                  Uppdatera vy
                </Button>
                <Button
                  size="sm"
                  disabled={saving || !map}
                  onClick={() => void handleSave()}
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sparar…
                    </>
                  ) : (
                    'Spara mappning i appen'
                  )}
                </Button>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fil</TableHead>
                    <TableHead>Process</TableHead>
                    <TableHead>Call Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subprocess‑fil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="align-top">
                        <code className="text-xs bg-muted px-1 rounded">
                          {row.bpmnFile}
                        </code>
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        <div className="font-medium">{row.processName}</div>
                        <div className="text-muted-foreground">
                          id: <code>{row.processId}</code>
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        <div className="font-medium">
                          {row.callActivityName ?? row.callActivityId}
                        </div>
                        <div className="text-muted-foreground">
                          id: <code>{row.callActivityId}</code>
                          {row.calledElement && (
                            <>
                              {' · '}calledElement:{' '}
                              <code>{row.calledElement}</code>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {statusBadge(row.status)}
                      </TableCell>
                      <TableCell className="align-top">
                        <Select
                          value={row.subprocessFile ?? ''}
                          onValueChange={(value) =>
                            updateRowSubprocess(
                              row.id,
                              value === '' ? null : value,
                            )
                          }
                        >
                          <SelectTrigger className="w-[260px]">
                            <SelectValue placeholder="Ingen subprocess vald" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Ingen subprocess</SelectItem>
                            {subprocessCandidates.map((candidate) => (
                              <SelectItem
                                key={candidate}
                                value={candidate}
                              >
                                {candidate}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
