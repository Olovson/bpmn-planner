import { useDocVariantAvailability } from '@/hooks/useDocVariantAvailability';

interface DocVariantBadgesProps {
  docId: string;
  compact?: boolean;
}

export const DocVariantBadges = ({ docId, compact }: DocVariantBadgesProps) => {
  const { isLoading, hasClaude } = useDocVariantAvailability(docId);

  if (isLoading) return null;
  if (!hasClaude) return null;

  const baseClass =
    'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-muted text-muted-foreground';

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? 'mt-1' : 'mt-2'}`}>
      {hasClaude && <span className={baseClass}>Claude</span>}
    </div>
  );
};

