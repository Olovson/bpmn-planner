import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useProcessTree } from '@/hooks/useProcessTree';
import { useAllBpmnNodes } from '@/hooks/useAllBpmnNodes';
import { buildProjectPlanRows } from '@/lib/projectPlan';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';

const ProjectPlanPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const { data: rootFile } = useRootBpmnFile();
  const { data: processTree } = useProcessTree(rootFile || 'mortgage.bpmn');
  const { nodes, loading } = useAllBpmnNodes();

  const rows = buildProjectPlanRows(processTree, nodes);

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'files') navigate('/files');
    else if (view === 'project') navigate('/project-plan');
    else if (view === 'timeline') navigate('/timeline');
    else navigate('/project-plan');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleExportExcel = () => {
    if (!rows.length) return;

    const exportData = rows.map((row) => ({
      processOrder: row.processOrder,
      'Feature Goal': row.processStepName,
      Epic: row.summary,
      'User Story': '',
      Level: row.level,
      Parent: row.parent ?? '',
      'BPMN File': row.bpmnFile,
      'BPMN Node ID': row.bpmnNodeId,
      Labels: row.labels.join(', '),
      Dependencies: row.dependencies.join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projektplan');

    XLSX.writeFile(wb, 'projektplan.xlsx');
  };

  const handleExportJira = () => {
    if (!rows.length) return;

    const header = ['Summary', 'IssueType', 'Parent'].join(',');
    const lines = rows.map((row) => {
      const issueType =
        row.level === 'FG' ? 'Feature Goal' :
        row.level === 'Epic' ? 'Epic' :
        row.level === 'Story' ? 'Story' :
        row.level === 'Task' ? 'Task' : 'Bug';

      const summary = `"${row.summary.replace(/"/g, '""')}"`;
      const parent = row.parent ? `"${row.parent.replace(/"/g, '""')}"` : '';
      return [summary, issueType, parent].join(',');
    });

    const csvContent = [header, ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'projektplan-jira.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user.email}
        currentView="project"
        onViewChange={handleViewChange}
        onOpenVersions={() => navigate('/')}
        onSignOut={handleSignOut}
        isTestsEnabled={hasTests}
      />

      <main className="flex-1 min-w-0 overflow-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Projektplan</h1>
            <p className="text-sm text-muted-foreground">
              Diagram: [{rootFile || 'mortgage.bpmn'}]
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!rows.length}>
              Exportera Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJira} disabled={!rows.length}>
              Exportera Jira
            </Button>
          </div>
        </div>

        <div className="border rounded-lg">
          <div className="overflow-x-auto max-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>processOrder</TableHead>
                  <TableHead>Feature Goal</TableHead>
                  <TableHead>Epic</TableHead>
                  <TableHead>User Story</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>BPMN File</TableHead>
                  <TableHead>BPMN Node ID</TableHead>
                  <TableHead>Labels</TableHead>
                  <TableHead>Dependencies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-xs text-muted-foreground py-6"
                    >
                      Laddar projektplan…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rows.map((row, index) => (
                  <TableRow key={`${row.bpmnFile}:${row.bpmnNodeId}:${row.level}:${row.processOrder}:${index}`}>
                    <TableCell className="text-xs">{row.processOrder}</TableCell>
                    <TableCell className="text-xs">{row.processStepName}</TableCell>
                    <TableCell className="text-xs">{row.summary}</TableCell>
                    <TableCell className="text-xs">{''}</TableCell>
                    <TableCell className="text-xs">{row.parent ?? ''}</TableCell>
                    <TableCell className="text-xs">{row.level}</TableCell>
                    <TableCell className="text-xs font-mono">{row.bpmnFile}</TableCell>
                    <TableCell className="text-xs font-mono">{row.bpmnNodeId}</TableCell>
                    <TableCell className="text-xs">{row.labels.join(', ')}</TableCell>
                    <TableCell className="text-xs">
                      {row.dependencies.length ? row.dependencies.join(', ') : ''}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-xs text-muted-foreground py-6"
                    >
                      Inga projektplanrader hittades.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectPlanPage;
