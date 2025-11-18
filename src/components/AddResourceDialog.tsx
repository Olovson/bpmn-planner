import { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { elementResourceMapping } from '@/data/elementResourceMapping';
import { useBpmnMappings } from '@/hooks/useBpmnMappings';

interface AddResourceDialogProps {
  bpmnFile: string;
  onResourceAdded?: () => void;
}

export const AddResourceDialog = ({ bpmnFile, onResourceAdded }: AddResourceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [nodeId, setNodeId] = useState('');
  const [customNodeId, setCustomNodeId] = useState('');
  const [jiraUrl, setJiraUrl] = useState('');
  const [testFile, setTestFile] = useState('');
  const [dmnFile, setDmnFile] = useState('');
  const { toast } = useToast();
  const { addJiraIssue, saveMapping } = useBpmnMappings(bpmnFile);

  const existingNodes = Object.keys(elementResourceMapping);
  const isCustomNode = nodeId === 'custom';
  const finalNodeId = isCustomNode ? customNodeId : nodeId;

  const handleSave = async () => {
    if (!finalNodeId.trim()) {
      toast({
        title: 'Saknad information',
        description: 'Vänligen välj eller ange ett nod-ID',
        variant: 'destructive',
      });
      return;
    }

    if (!jiraUrl.trim() && !testFile.trim() && !dmnFile.trim()) {
      toast({
        title: 'Saknad information',
        description: 'Vänligen ange minst en Jira URL, testfil eller DMN-fil',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Add Jira issue if provided
      if (jiraUrl.trim()) {
        await addJiraIssue(finalNodeId.trim(), {
          id: Date.now().toString(),
          url: jiraUrl.trim(),
        });
      }

      // Add test report URL if provided
      if (testFile.trim()) {
        await saveMapping(finalNodeId.trim(), {
          test_report_url: testFile.trim(),
        });
      }

      // Add DMN file if provided
      if (dmnFile.trim()) {
        await saveMapping(finalNodeId.trim(), {
          dmn_file: dmnFile.trim(),
        });
      }

      toast({
        title: 'Resurser sparade',
        description: `Lade till resurser för ${finalNodeId}`,
      });

      // Reset form
      setNodeId('');
      setCustomNodeId('');
      setJiraUrl('');
      setTestFile('');
      setDmnFile('');
      setOpen(false);

      // Notify parent
      onResourceAdded?.();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Resources
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Jira & Test Resources</DialogTitle>
          <DialogDescription>
            Link Jira issues and Playwright tests to BPMN nodes
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="node-select">BPMN Node</Label>
            <Select value={nodeId} onValueChange={setNodeId}>
              <SelectTrigger id="node-select">
                <SelectValue placeholder="Select a node" />
              </SelectTrigger>
              <SelectContent>
                {existingNodes.map((node) => (
                  <SelectItem key={node} value={node}>
                    {node}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom node ID...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCustomNode && (
            <div className="space-y-2">
              <Label htmlFor="custom-node">Custom Node ID</Label>
              <Input
                id="custom-node"
                placeholder="e.g., new-process-step"
                value={customNodeId}
                onChange={(e) => setCustomNodeId(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="jira-url">Jira Issue URL</Label>
            <Input
              id="jira-url"
              placeholder="https://pangsci.atlassian.net/browse/MORT-XXX"
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-file">Playwright Test File/URL</Label>
            <Input
              id="test-file"
              placeholder="tests/new-feature.spec.ts"
              value={testFile}
              onChange={(e) => setTestFile(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Resources
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
