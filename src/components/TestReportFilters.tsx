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
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as TestStatusFilter)}
          className="px-3 py-1.5 min-h-[32px] rounded-md border border-input bg-background text-xs mr-2 mb-1"
        >
          <option value="all">Alla statusar</option>
          <option value="passing">passing</option>
          <option value="failing">failing</option>
          <option value="pending">pending</option>
          <option value="skipped">skipped</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Filtrera på typ:
        </span>
        <select
          value={type}
          onChange={(e) => onTypeChange(e.target.value as TestDocTypeFilter)}
          className="px-3 py-1.5 min-h-[32px] rounded-md border border-input bg-background text-xs mr-2 mb-1"
        >
          <option value="all">Alla typer</option>
          <option value="feature-goal">Feature Goal</option>
          <option value="epic">Epic</option>
          <option value="business-rule">Business Rule</option>
        </select>
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
