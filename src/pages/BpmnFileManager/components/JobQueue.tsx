import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { GenerationJob } from '@/hooks/useGenerationJobs';
import { formatStatusLabel, getStatusBadgeClasses, formatOperationLabel } from '../utils/uiHelpers';
import { formatDuration } from './FileTable';

interface JobQueueProps {
  generationJobs: GenerationJob[];
  onAbortJob: (job: GenerationJob) => Promise<void>;
}

export function JobQueue({ generationJobs, onAbortJob }: JobQueueProps) {
  return (
    <Card className="mt-6">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold">Jobb & historik</h3>
      </div>
      <div className="p-4">
        <div className="space-y-2">
          {generationJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga aktiva jobb – alla genereringar är klara just nu.
            </p>
          ) : (
            <ul className="space-y-3">
              {generationJobs.map((job) => {
                const jobResult = (job.result || {}) as {
                  docs?: number;
                  tests?: number;
                  dorDod?: number;
                  filesAnalyzed?: string[];
                  mode?: string;
                  skippedSubprocesses?: string[];
                  llmProvider?: 'cloud' | 'local';
                };
                const providerLabel =
                  jobResult.llmProvider === 'cloud'
                    ? 'Claude'
                    : jobResult.llmProvider === 'ollama'
                    ? 'Ollama'
                    : undefined;
                const modeLabel =
                  job.mode === 'slow'
                    ? providerLabel
                      ? `LLM (${providerLabel})`
                      : 'Slow LLM'
                    : 'Okänt';
                const statusLabel = formatStatusLabel(job.status);
                const durationMs =
                  job.started_at && job.finished_at
                    ? new Date(job.finished_at).getTime() -
                      new Date(job.started_at).getTime()
                    : undefined;

                return (
                  <li
                    key={job.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-2 border rounded-lg p-3"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold mb-1">
                        {job.file_name} · {modeLabel} · {statusLabel}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatOperationLabel(job.operation)} · Start:{' '}
                        {job.created_at
                          ? new Date(job.created_at).toLocaleTimeString('sv-SE', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : 'okänd'}
                        {durationMs !== undefined && (
                          <> · Körtid: {formatDuration(durationMs)}</>
                        )}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        {job.status === 'running' && job.total ? (
                          <p>
                            Steg {job.progress ?? 0} av {job.total}
                          </p>
                        ) : null}
                        {job.status === 'succeeded' && (
                          <p>
                            {jobResult.docs ?? 0} dok · {jobResult.tests ?? 0} tester
                          </p>
                        )}
                        {jobResult.filesAnalyzed && jobResult.filesAnalyzed.length > 0 && (
                          <p className="line-clamp-1">
                            Filer: {jobResult.filesAnalyzed.join(', ')}
                          </p>
                        )}
                        {Array.isArray(jobResult.skippedSubprocesses) &&
                          jobResult.skippedSubprocesses.length > 0 && (
                            <p className="text-amber-600">
                              Hoppade över {jobResult.skippedSubprocesses.length} subprocesser
                            </p>
                          )}
                        {job.error && (
                          <p className="text-red-600">{job.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${getStatusBadgeClasses(job.status)}`}
                      >
                        {statusLabel}
                      </span>
                      {job.status === 'running' && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {(job.status === 'running' || job.status === 'pending') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onAbortJob(job)}
                        >
                          Stoppa
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

