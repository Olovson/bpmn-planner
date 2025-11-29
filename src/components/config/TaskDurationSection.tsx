import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGlobalProjectConfig } from '@/contexts/GlobalProjectConfigContext';
import { Calendar } from 'lucide-react';

export const TaskDurationSection = () => {
  const { defaultTaskWeeks, setDefaultTaskWeeks } = useGlobalProjectConfig();

  const handleChange = (value: string) => {
    const weeks = parseFloat(value);
    if (!isNaN(weeks) && weeks >= 0.5 && weeks <= 52) {
      setDefaultTaskWeeks(weeks);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>Standard task-duration</CardTitle>
        </div>
        <CardDescription>
          Påverkar alla tasks på timeline som inte har specifik konfiguration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="default-task-weeks">Hur lång tid tar en generell task?</Label>
          <div className="flex items-center gap-2">
            <Input
              id="default-task-weeks"
              type="number"
              step="0.5"
              min="0.5"
              max="52"
              value={defaultTaskWeeks}
              onChange={(e) => handleChange(e.target.value)}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">veckor</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Min: 0.5 veckor, Max: 52 veckor
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

