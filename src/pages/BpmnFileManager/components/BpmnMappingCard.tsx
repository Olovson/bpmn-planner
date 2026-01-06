import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';
import type { BpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import {
  buildBpmnMappingOverview,
  type BpmnMappingRow,
} from '@/lib/bpmn/bpmnMappingOverview';
import { invalidateStructureQueries } from '@/lib/queryInvalidation';

interface BpmnMappingCardProps {
  filesCount: number;
}

const NONE_VALUE = '__none__';

export function BpmnMappingCard({ filesCount }: BpmnMappingCardProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<BpmnMap | null>(null);
  const [rows, setRows] = useState<BpmnMappingRow[]>([]);
  const [originalRows, setOriginalRows] = useState<Map<string, string | null>>(
    () => new Map(),
  );
  const [subprocessCandidates, setSubprocessCandidates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const canUseLlm = import.meta.env.VITE_USE_LLM === 'true';

  const loadData = async () => {
    if (filesCount === 0) return;
    try {
      setLoading(true);
      setError(null);
      setInfoMessage(null);

      const { data, error } = await supabase
        .from('bpmn_files')
        .select('file_name, storage_path, meta')
        .eq('file_type', 'bpmn');

      if (error) throw error;

      const files =
        data?.map((f: any) => ({
          file_name: f.file_name as string,
          storage_path: (f.storage_path as string) ?? null,
          meta: (f.meta as any) ?? null,
        })) ?? [];

      if (files.length === 0) {
        setRows([]);
        setSubprocessCandidates([]);
        setMap(null);
        return;
      }

      const { loadBpmnMapFromStorageSimple } = await import(
        '@/lib/bpmn/bpmnMapStorage'
      );
      const currentMap = await loadBpmnMapFromStorageSimple();
      const overview = buildBpmnMappingOverview(currentMap, files);

      setMap(currentMap);
      setRows(overview.rows);
      setSubprocessCandidates(overview.subprocessCandidates);

      const original = new Map<string, string | null>();
      for (const r of overview.rows) {
        original.set(r.id, r.subprocessFile);
      }
      setOriginalRows(original);
    } catch (e: any) {
      console.error('[BpmnMappingCard] Failed to load overview:', e);
      setError(
        e?.message ??
          'Kunde inte ladda BPMN‑mappning. Se konsollen för detaljer.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filesCount > 0) {
      void loadData();
    }
  }, [filesCount]);

  const filteredRows = useMemo(() => rows, [rows]);

  const summary = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter((r) => r.status === 'ok').length;
    const unclearOrMissing = total - ok;
    return { total, ok, unclearOrMissing };
  }, [rows]);

  const dirtyCount = useMemo(() => {
    let count = 0;
    for (const r of rows) {
      const original = originalRows.get(r.id) ?? null;
      if (original !== r.subprocessFile) {
        count += 1;
      }
    }
    return count;
  }, [rows, originalRows]);

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

  const handleRefineWithClaude = async () => {
    if (!map || !canUseLlm) return;
    try {
      setRefining(true);
      setInfoMessage(null);

      const { refineBpmnMapWithLlm } = await import(
        '@/lib/bpmn/bpmnMapLlmRefinement'
      );

      const refinedMap = await refineBpmnMapWithLlm(map);
      setMap(refinedMap);

      const { data } = await supabase
        .from('bpmn_files')
        .select('file_name, storage_path, meta')
        .eq('file_type', 'bpmn');

      const files =
        data?.map((f: any) => ({
          file_name: f.file_name as string,
          storage_path: (f.storage_path as string) ?? null,
          meta: (f.meta as any) ?? null,
        })) ?? [];

      const overview = buildBpmnMappingOverview(refinedMap, files);

      const prevById = new Map(rows.map((r) => [r.id, r]));
      let improved = 0;
      for (const r of overview.rows) {
        const prev = prevById.get(r.id);
        if (prev && prev.status !== 'ok' && r.status === 'ok') {
          improved += 1;
        }
      }

      setRows(overview.rows);
      setSubprocessCandidates(overview.subprocessCandidates);

      const original = new Map<string, string | null>();
      for (const r of overview.rows) {
        original.set(r.id, r.subprocessFile);
      }
      setOriginalRows(original);

      setInfoMessage(
        improved > 0
          ? `Claude förbättrade ${improved} mappningar till tydliga kopplingar.`
          : 'Claude hittade inga tydligare mappningar – granska manuellt.',
      );
    } catch (e) {
      console.error('[BpmnMappingCard] Claude refinement failed:', e);
      setInfoMessage(
        'Kunde inte köra Claude‑förbättring (kontrollera API‑nycklar och loggar).',
      );
    } finally {
      setRefining(false);
    }
  };

  const handleSave = async () => {
    if (!map || dirtyCount === 0) return;
    try {
      setSaving(true);
      setError(null);
      setInfoMessage(null);

      const updatedMap: BpmnMap = {
        ...map,
        processes: map.processes.map((proc) => {
          const procRows = rows.filter(
            (r) => r.bpmnFile === proc.bpmn_file && r.processId === proc.process_id,
          );
          if (procRows.length === 0) {
            return proc;
          }

          const existing = proc.call_activities ?? [];
          const byId = new Map(existing.map((ca) => [ca.bpmn_id, ca]));

          for (const row of procRows) {
            const originalSubprocess = originalRows.get(row.id) ?? null;
            if (originalSubprocess === row.subprocessFile) continue;

            const existingCa = byId.get(row.callActivityId);
            const base = existingCa ?? { bpmn_id: row.callActivityId };

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

      const newOriginal = new Map<string, string | null>();
      for (const r of rows) {
        newOriginal.set(r.id, r.subprocessFile);
      }
      setOriginalRows(newOriginal);

      // Invalidera struktur-relaterade queries så att hela appen ser den nya mappningen
      invalidateStructureQueries(queryClient);

      // Ladda om översikten så att kortet speglar senaste data
      void loadData();

      setInfoMessage('Mappningar sparades i appen.');
    } catch (e: any) {
      console.error('[BpmnMappingCard] Failed to save mapping:', e);
      setError(
        e?.message ??
          'Kunde inte spara uppdaterad bpmn‑map.json. Se konsollen för detaljer.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (filesCount === 0) {
    return null;
  }

  return (
    <Card className="mt-4 p-4 space-y-3">
      <div
        className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none rounded-md px-2 py-1 -mx-2 -mt-1 transition-colors hover:bg-muted/70"
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">BPMN‑mappning</span>
            {summary.unclearOrMissing === 0 ? (
              <Badge variant="outline" className="border-green-500 text-green-700">
                Alla call activities har tydliga mappningar
              </Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                {summary.unclearOrMissing} call activities behöver mappning eller granskning
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Call activities totalt: <strong>{summary.total}</strong> · Klara:{' '}
            <strong className="text-green-700">{summary.ok}</strong> · Otydliga eller
            saknas:{' '}
            <strong className="text-orange-700">
              {summary.unclearOrMissing}
            </strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <>
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {infoMessage && (
            <Alert>
              <AlertDescription className="text-xs">{infoMessage}</AlertDescription>
            </Alert>
          )}

          {rows.length === 0 && !loading ? (
            <p className="text-xs text-muted-foreground">
              Inga call activities hittades ännu eller bpmn‑map.json saknar processer.
              Ladda upp BPMN‑filer och generera en karta för att se mappningar här.
            </p>
          ) : (
            <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span>Visar {filteredRows.length} call activities</span>
              {dirtyCount > 0 && (
                <span className="text-orange-700">
                  {dirtyCount} osparade ändring(ar)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!canUseLlm || summary.unclearOrMissing === 0 || refining}
                onClick={() => void handleRefineWithClaude()}
                title={
                  !canUseLlm
                    ? 'Claude är inte aktiverad i denna miljö (VITE_USE_LLM=false)'
                    : summary.unclearOrMissing === 0
                    ? 'Det finns inga otydliga mappningar att förbättra'
                    : 'Låt Claude analysera och förbättra otydliga mappningar'
                }
                className="gap-1"
              >
                {refining ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Förbättrar…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    Claude för oklara ({summary.unclearOrMissing})
                  </>
                )}
              </Button>
              <Button
                size="sm"
                disabled={dirtyCount === 0 || saving}
                onClick={() => void handleSave()}
                className="gap-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Sparar…
                  </>
                ) : (
                  'Spara mappningar'
                )}
              </Button>
            </div>
          </div>

          <div className="border rounded-md overflow-x-auto">
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
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="align-top text-xs">
                      <code className="bg-muted px-1 rounded">
                        {row.bpmnFile}
                      </code>
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      <div className="font-medium">
                        {row.processName ?? row.processId}
                      </div>
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
                    <TableCell className="align-top text-xs">
                      {row.status === 'ok' ? (
                        <Badge
                          variant="outline"
                          className="border-green-500 text-green-700"
                        >
                          OK
                        </Badge>
                      ) : row.status === 'unclear' ? (
                        <Badge
                          variant="outline"
                          className="border-yellow-500 text-yellow-700"
                        >
                          Otydlig
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-orange-500 text-orange-700"
                        >
                          Saknas
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Select
                        value={row.subprocessFile ?? NONE_VALUE}
                        onValueChange={(value) =>
                          updateRowSubprocess(
                            row.id,
                            value === NONE_VALUE ? null : value,
                          )
                        }
                      >
                        <SelectTrigger className="w-[260px]">
                          <SelectValue placeholder="Ingen subprocess vald" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>Ingen subprocess</SelectItem>
                          {subprocessCandidates.map((candidate) => (
                            <SelectItem key={candidate} value={candidate}>
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
        </>
      )}

      {expanded && summary.unclearOrMissing > 0 && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground mt-1">
          <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5" />
          <span>
            Generering av dokumentation och tester fungerar bäst när alla call
            activities har tydliga mappningar. Gå igenom raderna ovan, använd Claude
            vid behov och spara ändringarna.
          </span>
        </div>
      )}
    </Card>
  );
}
