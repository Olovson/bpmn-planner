import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGlobalProjectConfig } from '@/contexts/GlobalProjectConfigContext';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VALIDATION } from '@/types/globalProjectConfig';

interface ProjectActivity {
  id: string;
  name: string;
  weeks: number; // Legacy, kept for backward compatibility
  analysisWeeks: number;
  implementationWeeks: number;
  testingWeeks: number;
  validationWeeks: number;
  totalWeeks: number;
}

export const ProjectActivitiesSection = () => {
  const { customActivities, addCustomActivity, updateCustomActivity, removeCustomActivity } = useGlobalProjectConfig();
  const { toast } = useToast();

  // Convert customActivities to ProjectActivity format (only before-all activities)
  const projectActivities = useMemo(() => {
    const beforeActivities = customActivities
      .filter((a) => a.placement === 'before-all')
      .sort((a, b) => a.order - b.order);

    // Check if "Etablering" and "Plattform" exist
    const hasEtablering = beforeActivities.some((a) => a.name.toLowerCase() === 'etablering');
    const hasPlattform = beforeActivities.some((a) => a.name.toLowerCase() === 'plattform');

    const activities: ProjectActivity[] = [];

    // Always show "Etablering" first (use existing or create placeholder)
    if (hasEtablering) {
      const etablering = beforeActivities.find((a) => a.name.toLowerCase() === 'etablering')!;
      const analysisWeeks = etablering.analysisWeeks ?? 0;
      const implementationWeeks = etablering.implementationWeeks ?? 2;
      const testingWeeks = etablering.testingWeeks ?? 0;
      const validationWeeks = etablering.validationWeeks ?? 0;
      activities.push({
        id: etablering.id,
        name: etablering.name,
        weeks: etablering.weeks,
        analysisWeeks,
        implementationWeeks,
        testingWeeks,
        validationWeeks,
        totalWeeks: analysisWeeks + implementationWeeks + testingWeeks + validationWeeks,
      });
    } else {
      activities.push({
        id: 'etablering-default',
        name: 'Etablering',
        weeks: 2,
        analysisWeeks: 0,
        implementationWeeks: 2,
        testingWeeks: 0,
        validationWeeks: 0,
        totalWeeks: 2,
      });
    }

    // Always show "Plattform" second (use existing or create placeholder)
    if (hasPlattform) {
      const plattform = beforeActivities.find((a) => a.name.toLowerCase() === 'plattform')!;
      const analysisWeeks = plattform.analysisWeeks ?? 0;
      const implementationWeeks = plattform.implementationWeeks ?? 2;
      const testingWeeks = plattform.testingWeeks ?? 0;
      const validationWeeks = plattform.validationWeeks ?? 0;
      activities.push({
        id: plattform.id,
        name: plattform.name,
        weeks: plattform.weeks,
        analysisWeeks,
        implementationWeeks,
        testingWeeks,
        validationWeeks,
        totalWeeks: analysisWeeks + implementationWeeks + testingWeeks + validationWeeks,
      });
    } else {
      activities.push({
        id: 'plattform-default',
        name: 'Plattform',
        weeks: 4,
        analysisWeeks: 0,
        implementationWeeks: 2,
        testingWeeks: 0,
        validationWeeks: 0,
        totalWeeks: 2,
      });
    }

    // Add other existing activities (excluding Etablering and Plattform)
    beforeActivities.forEach((activity) => {
      const isEtablering = activity.name.toLowerCase() === 'etablering';
      const isPlattform = activity.name.toLowerCase() === 'plattform';
      if (!isEtablering && !isPlattform) {
        const analysisWeeks = activity.analysisWeeks ?? 0;
        const implementationWeeks = activity.implementationWeeks ?? 0;
        const testingWeeks = activity.testingWeeks ?? 0;
        const validationWeeks = activity.validationWeeks ?? 0;
        activities.push({
          id: activity.id,
          name: activity.name,
          weeks: activity.weeks,
          analysisWeeks,
          implementationWeeks,
          testingWeeks,
          validationWeeks,
          totalWeeks: analysisWeeks + implementationWeeks + testingWeeks + validationWeeks,
        });
      }
    });

    return activities;
  }, [customActivities]);

  const handleAdd = async () => {
    const newActivity = {
      name: 'Ny aktivitet',
      weeks: 2, // Legacy field
      placement: 'before-all' as const,
      analysisWeeks: 0,
      implementationWeeks: 2,
      testingWeeks: 0,
      validationWeeks: 0,
    };
    await addCustomActivity(newActivity);
    toast({
      title: 'Aktivitet tillagd',
      description: 'En ny aktivitet har lagts till.',
    });
  };

  const handleDelete = async (activityId: string) => {
    const activity = customActivities.find((a) => a.id === activityId);
    if (!activity) {
      // It's a default activity, can't delete
      toast({
        title: 'Kan inte ta bort',
        description: 'Standardaktiviteter (Etablering, Plattform) kan inte tas bort.',
        variant: 'destructive',
      });
      return;
    }

    if (confirm('Är du säker på att du vill ta bort denna aktivitet?')) {
      await removeCustomActivity(activityId);
      toast({
        title: 'Aktivitet borttagen',
        description: 'Aktiviteten har tagits bort.',
      });
    }
  };

  const handleNameChange = async (activityId: string, newName: string) => {
    if (!newName.trim()) return;

    const activity = customActivities.find((a) => a.id === activityId);
    if (!activity) {
      // It's a default activity, create it first
      const isEtablering = activityId === 'etablering-default';
      const defaultName = isEtablering ? 'Etablering' : 'Plattform';
      await addCustomActivity({
        name: newName.trim() || defaultName,
        weeks: isEtablering ? 2 : 4,
        placement: 'before-all',
      });
    } else {
      // Don't allow renaming Etablering/Plattform to something else
      const isEtablering = activity.name.toLowerCase() === 'etablering';
      const isPlattform = activity.name.toLowerCase() === 'plattform';
      if ((isEtablering || isPlattform) && newName.trim().toLowerCase() !== activity.name.toLowerCase()) {
        toast({
          title: 'Kan inte byta namn',
          description: 'Standardaktiviteter (Etablering, Plattform) kan inte byta namn.',
          variant: 'destructive',
        });
        return;
      }
      await updateCustomActivity(activityId, { name: newName.trim() });
    }
  };

  const handleChange = async (
    activityId: string,
    field: 'analysisWeeks' | 'implementationWeeks' | 'testingAndValidationWeeks',
    value: string
  ) => {
    const weeks = parseFloat(value);
    if (isNaN(weeks) || weeks < VALIDATION.MIN_WEEKS || weeks > VALIDATION.MAX_WEEKS) return;

    const activity = customActivities.find((a) => a.id === activityId);
    if (!activity) {
      // It's a default activity, create it first
      const isEtablering = activityId === 'etablering-default';
      const defaultName = isEtablering ? 'Etablering' : 'Plattform';
      const defaultAnalysis = 0;
      const defaultImplementation = 2;
      const defaultTesting = 0;
      const defaultValidation = 0;

      if (field === 'testingAndValidationWeeks') {
        await addCustomActivity({
          name: defaultName,
          weeks: defaultImplementation, // Legacy field
          placement: 'before-all',
          analysisWeeks: defaultAnalysis,
          implementationWeeks: defaultImplementation,
          testingWeeks: weeks,
          validationWeeks: 0,
        });
      } else {
        await addCustomActivity({
          name: defaultName,
          weeks: field === 'implementationWeeks' ? weeks : defaultImplementation, // Legacy field
          placement: 'before-all',
          analysisWeeks: field === 'analysisWeeks' ? weeks : defaultAnalysis,
          implementationWeeks: field === 'implementationWeeks' ? weeks : defaultImplementation,
          testingWeeks: defaultTesting,
          validationWeeks: defaultValidation,
        });
      }
    } else {
      if (field === 'testingAndValidationWeeks') {
        await updateCustomActivity(activityId, {
          testingWeeks: weeks,
          validationWeeks: 0,
        });
      } else {
        await updateCustomActivity(activityId, {
          [field]: weeks,
        });
      }
    }
  };

  const isDefaultActivity = (activityId: string) => {
    return activityId === 'etablering-default' || activityId === 'plattform-default';
  };

  const canDelete = (activityId: string) => {
    if (isDefaultActivity(activityId)) return false;
    const activity = customActivities.find((a) => a.id === activityId);
    return !!activity;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Projektövergripande aktiviteter</CardTitle>
          </div>
        </div>
        <CardDescription>
          Konfigurera aktiviteter som ska visas före BPMN-aktiviteter i timeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Add button */}
          <div className="flex justify-end">
            <Button onClick={handleAdd} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Lägg till aktivitet
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Aktivitet</TableHead>
                  <TableHead className="text-center w-[100px]">Analys</TableHead>
                  <TableHead className="text-center w-[120px]">Implementering</TableHead>
                  <TableHead className="text-center w-[120px]">Testing & Validering</TableHead>
                  <TableHead className="text-center w-[80px]">Totalt</TableHead>
                  <TableHead className="text-center w-[80px]">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <Input
                        value={activity.name}
                        onChange={(e) => handleNameChange(activity.id, e.target.value)}
                        onBlur={(e) => {
                          if (!e.target.value.trim()) {
                            e.target.value = activity.name;
                          }
                        }}
                        className="font-medium"
                        disabled={isDefaultActivity(activity.id) || activity.name.toLowerCase() === 'etablering' || activity.name.toLowerCase() === 'plattform'}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.5"
                        min={VALIDATION.MIN_WEEKS}
                        max={VALIDATION.MAX_WEEKS}
                        value={activity.analysisWeeks}
                        onChange={(e) => handleChange(activity.id, 'analysisWeeks', e.target.value)}
                        className="h-8 w-16 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.5"
                        min={VALIDATION.MIN_WEEKS}
                        max={VALIDATION.MAX_WEEKS}
                        value={activity.implementationWeeks}
                        onChange={(e) => handleChange(activity.id, 'implementationWeeks', e.target.value)}
                        className="h-8 w-16 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.5"
                        min={VALIDATION.MIN_WEEKS}
                        max={VALIDATION.MAX_WEEKS}
                        value={activity.testingWeeks + activity.validationWeeks}
                        onChange={(e) => handleChange(activity.id, 'testingAndValidationWeeks', e.target.value)}
                        className="h-8 w-16 text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {activity.totalWeeks}v
                    </TableCell>
                    <TableCell className="text-center">
                      {canDelete(activity.id) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(activity.id)}
                          aria-label="Ta bort"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

