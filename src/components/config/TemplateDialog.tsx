import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DEFAULT_ACTIVITY_TEMPLATES } from '@/types/globalProjectConfig';
import { FileText } from 'lucide-react';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: typeof DEFAULT_ACTIVITY_TEMPLATES[number]) => void;
}

export const TemplateDialog = ({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplateDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Välj från mall</DialogTitle>
          <DialogDescription>
            Välj en mall för att snabbt lägga till en aktivitet. Du kan justera den efter att den lagts till.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {DEFAULT_ACTIVITY_TEMPLATES.map((template) => (
            <div
              key={template.name}
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
              onClick={() => {
                onSelectTemplate(template);
                onOpenChange(false);
              }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="font-medium">{template.name}</div>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {template.description}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {template.defaultWeeks} veckor • Före BPMN-aktiviteter
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTemplate(template);
                  onOpenChange(false);
                }}
              >
                Välj
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

