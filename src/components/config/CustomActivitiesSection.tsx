import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGlobalProjectConfig } from '@/contexts/GlobalProjectConfigContext';
import { DEFAULT_ACTIVITY_TEMPLATES } from '@/types/globalProjectConfig';
import { Plus, FileText, ChevronUp, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { ActivityDialog } from './ActivityDialog';
import { TemplateDialog } from './TemplateDialog';

export const CustomActivitiesSection = () => {
  const {
    customActivities,
    addCustomActivity,
    updateCustomActivity,
    removeCustomActivity,
  } = useGlobalProjectConfig();

  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);

  const beforeActivities = customActivities
    .filter((a) => a.placement === 'before-all')
    .sort((a, b) => a.order - b.order);

  const afterActivities = customActivities
    .filter((a) => a.placement === 'after-all')
    .sort((a, b) => a.order - b.order);

  const handleAddFromTemplate = (template: typeof DEFAULT_ACTIVITY_TEMPLATES[number]) => {
    addCustomActivity({
      name: template.name,
      weeks: template.defaultWeeks,
      placement: 'before-all', // Templates are always "before-all"
    });
    setTemplateDialogOpen(false);
  };

  const handleMoveUp = async (activityId: string) => {
    const activity = customActivities.find((a) => a.id === activityId);
    if (!activity) return;

    const samePlacement = customActivities.filter((a) => a.placement === activity.placement);
    const sorted = samePlacement.sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex((a) => a.id === activityId);

    if (currentIndex > 0) {
      const prevActivity = sorted[currentIndex - 1];
      await updateCustomActivity(activityId, { order: prevActivity.order });
      await updateCustomActivity(prevActivity.id, { order: activity.order });
    }
  };

  const handleMoveDown = async (activityId: string) => {
    const activity = customActivities.find((a) => a.id === activityId);
    if (!activity) return;

    const samePlacement = customActivities.filter((a) => a.placement === activity.placement);
    const sorted = samePlacement.sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex((a) => a.id === activityId);

    if (currentIndex < sorted.length - 1) {
      const nextActivity = sorted[currentIndex + 1];
      await updateCustomActivity(activityId, { order: nextActivity.order });
      await updateCustomActivity(nextActivity.id, { order: activity.order });
    }
  };

  const handleEdit = (activityId: string) => {
    setEditingActivity(activityId);
    setActivityDialogOpen(true);
  };

  const handleDelete = async (activityId: string) => {
    if (confirm('Är du säker på att du vill ta bort denna aktivitet?')) {
      await removeCustomActivity(activityId);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Projektövergripande aktiviteter</CardTitle>
          </div>
          <CardDescription>
            Lägg till aktiviteter som ska visas före eller efter BPMN-aktiviteter i timeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setEditingActivity(null);
                  setActivityDialogOpen(true);
                }}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Lägg till aktivitet
              </Button>
              <Button
                onClick={() => setTemplateDialogOpen(true)}
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Välj från mall
              </Button>
            </div>

            {customActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <p>Inga aktiviteter ännu.</p>
                <p className="text-sm mt-2">Lägg till aktiviteter manuellt eller välj från mallar.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {beforeActivities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Före BPMN-aktiviteter</h4>
                    <div className="space-y-2">
                      {beforeActivities.map((activity) => (
                        <ActivityCard
                          key={activity.id}
                          activity={activity}
                          onMoveUp={() => handleMoveUp(activity.id)}
                          onMoveDown={() => handleMoveDown(activity.id)}
                          onEdit={() => handleEdit(activity.id)}
                          onDelete={() => handleDelete(activity.id)}
                          canMoveUp={beforeActivities[0]?.id !== activity.id}
                          canMoveDown={beforeActivities[beforeActivities.length - 1]?.id !== activity.id}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {afterActivities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Efter BPMN-aktiviteter</h4>
                    <div className="space-y-2">
                      {afterActivities.map((activity) => (
                        <ActivityCard
                          key={activity.id}
                          activity={activity}
                          onMoveUp={() => handleMoveUp(activity.id)}
                          onMoveDown={() => handleMoveDown(activity.id)}
                          onEdit={() => handleEdit(activity.id)}
                          onDelete={() => handleDelete(activity.id)}
                          canMoveUp={afterActivities[0]?.id !== activity.id}
                          canMoveDown={afterActivities[afterActivities.length - 1]?.id !== activity.id}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        editingActivity={editingActivity ? customActivities.find((a) => a.id === editingActivity) || null : null}
        onSave={(activity) => {
          if (editingActivity) {
            updateCustomActivity(editingActivity, activity);
          } else {
            addCustomActivity(activity);
          }
          setActivityDialogOpen(false);
          setEditingActivity(null);
        }}
      />

      <TemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onSelectTemplate={handleAddFromTemplate}
      />
    </>
  );
};

const ActivityCard = ({
  activity,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  canMoveUp,
  canMoveDown,
}: {
  activity: { name: string; weeks: number; placement: 'before-all' | 'after-all' };
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="font-medium">{activity.name}</div>
        <div className="text-sm text-muted-foreground">
          Tid: {activity.weeks} veckor • Placering: {activity.placement === 'before-all' ? 'Före BPMN-aktiviteter' : 'Efter BPMN-aktiviteter'}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label="Flytta upp"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label="Flytta ner"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label="Redigera"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label="Ta bort"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

