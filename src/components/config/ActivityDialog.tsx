import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { CustomActivity } from '@/types/globalProjectConfig';

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingActivity: CustomActivity | null;
  onSave: (activity: Omit<CustomActivity, 'id' | 'order'>) => void;
}

export const ActivityDialog = ({
  open,
  onOpenChange,
  editingActivity,
  onSave,
}: ActivityDialogProps) => {
  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState('2');
  const [placement, setPlacement] = useState<'before-all' | 'after-all'>('before-all');

  useEffect(() => {
    if (editingActivity) {
      setName(editingActivity.name);
      setWeeks(editingActivity.weeks.toString());
      setPlacement(editingActivity.placement);
    } else {
      setName('');
      setWeeks('2');
      setPlacement('before-all');
    }
  }, [editingActivity, open]);

  const handleSave = () => {
    if (!name.trim() || name.length > 100) {
      return;
    }

    const weeksNum = parseFloat(weeks);
    if (isNaN(weeksNum) || weeksNum < 0.5 || weeksNum > 52) {
      return;
    }

    onSave({
      name: name.trim(),
      weeks: weeksNum,
      placement,
    });
  };

  const isValid = () => {
    if (!name.trim() || name.length > 100) return false;
    const weeksNum = parseFloat(weeks);
    if (isNaN(weeksNum) || weeksNum < 0.5 || weeksNum > 52) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingActivity ? 'Redigera aktivitet' : 'Lägg till aktivitet'}
          </DialogTitle>
          <DialogDescription>
            Skapa en anpassad projektaktivitet som ska visas i timeline
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="activity-name">Namn</Label>
            <Input
              id="activity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T.ex. Implementeringsprojekt"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Max 100 tecken
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-weeks">Tid (veckor)</Label>
            <Input
              id="activity-weeks"
              type="number"
              step="0.5"
              min="0.5"
              max="52"
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Min: 0.5 veckor, Max: 52 veckor
            </p>
          </div>

          <div className="space-y-2">
            <Label>Placering</Label>
            <RadioGroup value={placement} onValueChange={(value) => setPlacement(value as 'before-all' | 'after-all')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="before-all" id="placement-before" />
                <Label htmlFor="placement-before" className="cursor-pointer">
                  Före BPMN-aktiviteter
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after-all" id="placement-after" />
                <Label htmlFor="placement-after" className="cursor-pointer">
                  Efter BPMN-aktiviteter
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={!isValid()}>
            {editingActivity ? 'Spara' : 'Lägg till'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

