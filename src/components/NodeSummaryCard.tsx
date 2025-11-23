import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileCode, Clock, LayoutList } from 'lucide-react';

type TestStatus = 'passing' | 'failing' | 'pending' | 'skipped';

interface NodeSummaryCardProps {
  title?: string | null;
  elementId?: string | null;
  elementTypeLabel?: string | null;
  testStatus?: TestStatus | null;
  jiraType?: 'feature goal' | 'epic' | '' | null;
  hasSubprocess?: boolean;
  onOpenDocs?: () => void;
  canOpenDocs?: boolean;
  onOpenTestScript?: () => void;
  canOpenTestScript?: boolean;
  onOpenTestReport?: () => void;
  canOpenTestReport?: boolean;
  onOpenNodeMatrix?: () => void;
}

export function NodeSummaryCard({
  title,
  elementId,
  elementTypeLabel,
  testStatus,
  jiraType,
  hasSubprocess,
  onOpenDocs,
  canOpenDocs,
  onOpenTestScript,
  canOpenTestScript,
  onOpenTestReport,
  canOpenTestReport,
  onOpenNodeMatrix,
}: NodeSummaryCardProps) {
  const hasActions =
    onOpenDocs || onOpenTestScript || onOpenTestReport || onOpenNodeMatrix;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {title || elementId || 'Ingen nod vald'}
            </CardTitle>
            {elementId && (
              <CardDescription className="font-mono text-xs mt-1">
                {elementId}
              </CardDescription>
            )}
          </div>
          {elementTypeLabel && (
            <Badge variant="secondary" className="text-xs">
              {elementTypeLabel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {(testStatus || jiraType || hasSubprocess) && (
          <div className="flex flex-wrap gap-2">
            {testStatus && (
              <Badge variant={testStatus === 'passing' ? 'default' : 'destructive'}>
                Test: {testStatus}
              </Badge>
            )}
            {jiraType && (
              <Badge variant="outline">Jira: {jiraType}</Badge>
            )}
            {hasSubprocess && (
              <Badge variant="outline">Har subprocess</Badge>
            )}
          </div>
        )}

        {hasActions && (
          <div className="grid gap-2">
            {onOpenDocs && (
              <Button
                variant="outline"
                size="sm"
                disabled={!canOpenDocs}
                onClick={onOpenDocs}
                className="justify-start gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Dokumentation
              </Button>
            )}
            {onOpenTestScript && (
              <Button
                variant="outline"
                size="sm"
                disabled={!canOpenTestScript}
                onClick={onOpenTestScript}
                className="justify-start gap-2"
              >
                <FileCode className="h-4 w-4" />
                Testscript (Local/Full)
              </Button>
            )}
            {onOpenTestReport && (
              <Button
                variant="outline"
                size="sm"
                disabled={!canOpenTestReport}
                onClick={onOpenTestReport}
                className="justify-start gap-2"
              >
                <Clock className="h-4 w-4" />
                Testrapport
              </Button>
            )}
            {onOpenNodeMatrix && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenNodeMatrix}
                className="justify-start gap-2"
              >
                <LayoutList className="h-4 w-4" />
                Öppna node-matrix
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

