import { cn } from '@/lib/utils';
import { CoverageStatus } from '@/hooks/useFileArtifactCoverage';

interface ArtifactStatusBadgeProps {
  icon: string;
  label: string;
  status: CoverageStatus;
  covered: number;
  total: number;
}

export function ArtifactStatusBadge({ 
  icon, 
  label, 
  status, 
  covered, 
  total 
}: ArtifactStatusBadgeProps) {
  const colors = {
    none: 'bg-red-50 text-red-700 border-red-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    full: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    noApplicableNodes: 'bg-slate-50 text-slate-600 border-slate-200',
  } as const;

  const text = 
    status === 'noApplicableNodes'
      ? label === 'Test'
        ? 'Inga testbara noder'
        : label === 'DoR/DoD'
        ? 'Inga relevanta noder'
        : 'Inga noder'
      : status === 'full'
      ? 'Komplett'
      : status === 'none'
      ? label === 'Test'
        ? 'Saknas'
        : 'Saknas'
      : `${covered}/${total}`;

  const tooltipText = 
    status === 'noApplicableNodes'
      ? label === 'Test'
        ? 'Filen innehåller inga testbara BPMN-noder'
        : label === 'DoR/DoD'
        ? 'Filen innehåller inga relevanta noder för DoR/DoD'
        : 'Filen innehåller inga relevanta noder'
      : status === 'none'
      ? label === 'Test'
        ? 'Det finns testbara noder, men inga testkopplingar'
        : `${label} saknas för alla ${total} noder`
      : status === 'full'
      ? `${label}: Alla ${total} noder har artefakten`
      : `${label}: ${covered} av ${total} noder har artefakten`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5',
        'text-[11px] font-medium',
        colors[status]
      )}
      title={tooltipText}
    >
      <span>{icon}</span>
      <span>{label}:</span>
      <span className="font-semibold">{text}</span>
    </div>
  );
}
