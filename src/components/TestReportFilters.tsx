import { Button } from '@/components/ui/button';

export type TestStatusFilter = 'all' | 'passing' | 'failing' | 'pending' | 'skipped';

export type TestDocTypeFilter = 'all' | 'feature-goal' | 'epic' | 'business-rule';

type Props = {
  status: TestStatusFilter;
  type: TestDocTypeFilter;
  bpmnFile: string;
  bpmnOptions: string[];
  onStatusChange: (status: TestStatusFilter) => void;
  onTypeChange: (type: TestDocTypeFilter) => void;
  onBpmnChange: (file: string) => void;
};

export function TestReportFilters({
  status,
  type,
  bpmnFile,
  bpmnOptions,
  onStatusChange,
  onTypeChange,
  onBpmnChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Filtrera på status:
        </span>
        {(['all', 'passing', 'failing', 'pending', 'skipped'] as const).map(
          (statusValue) => (
            <Button
              key={statusValue}
              size="xs"
              variant={status === statusValue ? 'default' : 'outline'}
              className="text-xs"
              onClick={() => onStatusChange(statusValue)}
            >
              {statusValue === 'all' ? 'Alla' : statusValue}
            </Button>
          ),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Filtrera på typ:
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Alla' },
            { id: 'feature-goal', label: 'Feature Goal' },
            { id: 'epic', label: 'Epic' },
            { id: 'business-rule', label: 'Business Rule' },
          ].map((opt) => (
            <Button
              key={opt.id}
              size="xs"
              variant={type === (opt.id as TestDocTypeFilter) ? 'default' : 'outline'}
              className="text-xs"
              onClick={() => onTypeChange(opt.id as TestDocTypeFilter)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Filtrera på BPMN‑fil:
        </span>
        <select
          value={bpmnFile}
          onChange={(e) => onBpmnChange(e.target.value)}
          className="px-3 py-1.5 min-h-[32px] rounded-md border border-input bg-background text-xs mr-2 mb-1"
        >
          <option value="all">Alla BPMN‑filer</option>
          {bpmnOptions.map((file) => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

