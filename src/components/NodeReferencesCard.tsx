import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ExternalLink, Link as LinkIcon, Plus } from 'lucide-react';
import { useNodeReferences } from '@/hooks/useNodeReferences';

interface NodeReferencesCardProps {
  bpmnFile?: string;
  elementId?: string | null;
}

const REF_TYPE_ICONS = {
  figma: '🎨',
  jira: '📋',
  confluence: '📝',
  other: '🔗',
};

const REF_TYPE_LABELS = {
  figma: 'Figma',
  jira: 'Jira',
  confluence: 'Confluence',
  other: 'Annat',
};

export const NodeReferencesCard = ({ bpmnFile, elementId }: NodeReferencesCardProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newRefType, setNewRefType] = useState<'figma' | 'jira' | 'confluence' | 'other'>('figma');
  const [newRefLabel, setNewRefLabel] = useState('');
  const [newRefUrl, setNewRefUrl] = useState('');

  const { references, groupedByType, isLoading, addReference, deleteReference } = useNodeReferences(
    bpmnFile,
    elementId
  );

  const handleAddReference = async () => {
    if (!bpmnFile || !newRefLabel.trim() || !newRefUrl.trim()) return;

    await addReference.mutateAsync({
      bpmn_file: bpmnFile,
      bpmn_element_id: elementId || null,
      ref_type: newRefType,
      ref_label: newRefLabel.trim(),
      ref_url: newRefUrl.trim(),
    });

    setNewRefLabel('');
    setNewRefUrl('');
    setIsAdding(false);
  };

  if (!bpmnFile) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Referenser</h3>
          {references.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {references.length}
            </Badge>
          )}
        </div>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 px-2"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Grouped references by type */}
      {Object.entries(groupedByType).map(([type, refs]) => (
        <div key={type} className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">{REF_TYPE_ICONS[type as keyof typeof REF_TYPE_ICONS]}</span>
            <span className="text-xs font-medium text-muted-foreground">
              {REF_TYPE_LABELS[type as keyof typeof REF_TYPE_LABELS]}
            </span>
            <Badge variant="outline" className="text-xs h-4 px-1">
              {refs.length}
            </Badge>
          </div>
          <div className="space-y-2 ml-5">
            {refs.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between gap-2 p-2 rounded bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{ref.ref_label}</p>
                  <a
                    href={ref.ref_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    {ref.ref_url}
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => deleteReference.mutate(ref.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {references.length === 0 && !isAdding && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Inga referenser ännu
        </p>
      )}

      {/* Add reference form */}
      {isAdding && (
        <div className="pt-3 border-t space-y-2">
          <Select
            value={newRefType}
            onValueChange={(value: any) => setNewRefType(value)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="figma">🎨 Figma</SelectItem>
              <SelectItem value="jira">📋 Jira</SelectItem>
              <SelectItem value="confluence">📝 Confluence</SelectItem>
              <SelectItem value="other">🔗 Annat</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Beskrivning (t.ex. UI mockup)"
            value={newRefLabel}
            onChange={(e) => setNewRefLabel(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="URL"
            value={newRefUrl}
            onChange={(e) => setNewRefUrl(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleAddReference}
              size="sm"
              className="flex-1 h-8"
              disabled={!newRefLabel.trim() || !newRefUrl.trim()}
            >
              Lägg till
            </Button>
            <Button
              onClick={() => {
                setIsAdding(false);
                setNewRefLabel('');
                setNewRefUrl('');
              }}
              variant="outline"
              size="sm"
              className="h-8"
            >
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
