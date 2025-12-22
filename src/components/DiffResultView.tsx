/**
 * DiffResultView - Reusable component for displaying diff results
 * 
 * Used in both BpmnDiffOverviewPage and BpmnFolderDiffPage
 */

import { useState } from 'react';
import { Plus, Minus, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { BpmnDiffResult } from '@/lib/bpmnDiff';

interface DiffResultViewProps {
  diffResult: BpmnDiffResult;
  fileName: string;
  onUpload?: () => void;
  showUploadButton?: boolean;
  compact?: boolean;
}

export function DiffResultView({
  diffResult,
  fileName,
  onUpload,
  showUploadButton = false,
  compact = false,
}: DiffResultViewProps) {
  const [expanded, setExpanded] = useState(false);

  // Check if this is a completely new file (all nodes are added, nothing removed/modified)
  const isNewFile = diffResult.added.length > 0 && 
                    diffResult.removed.length === 0 && 
                    diffResult.modified.length === 0;
  
  // Find process node if file is new
  const processNode = isNewFile 
    ? diffResult.added.find(n => n.nodeType === 'process')
    : null;
  
  // Separate process nodes from other nodes
  const processNodes = diffResult.added.filter(n => n.nodeType === 'process');
  const otherAddedNodes = diffResult.added.filter(n => n.nodeType !== 'process');

  // Format field names for display
  const formatFieldName = (field: string): string => {
    const fieldMap: Record<string, string> = {
      name: 'Namn',
      type: 'Typ',
      calledElement: 'Anropad process',
      processId: 'Process ID',
      callActivitiesCount: 'Antal call activities',
      tasksCount: 'Antal tasks',
      mapping: 'Mapping',
    };
    return fieldMap[field] || field;
  };

  // Format change values for display
  const formatChangeValue = (value: any): string => {
    if (value === null || value === undefined) return '(tomt)';
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nej';
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `[${value.length} items]`;
      }
      // For mapping objects, show key info
      if (value.subprocess_bpmn_file || value.matchedFileName) {
        return value.subprocess_bpmn_file || value.matchedFileName || '(okänd)';
      }
      return JSON.stringify(value).slice(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '');
    }
    return String(value);
  };

  const summary = {
    added: diffResult.added.length,
    removed: diffResult.removed.length,
    modified: diffResult.modified.length,
    unchanged: diffResult.unchanged.length,
  };

  const hasChanges = summary.added > 0 || summary.removed > 0 || summary.modified > 0;

  const getDiffTypeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'modified':
        return <Edit className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getDiffTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      added: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      removed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      modified: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };

    return (
      <Badge className={colors[type] || ''}>
        {type === 'added' && 'Tillagd'}
        {type === 'removed' && 'Borttagen'}
        {type === 'modified' && 'Ändrad'}
        {type === 'unchanged' && 'Oförändrad'}
      </Badge>
    );
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">{fileName}</CardTitle>
            <div className="flex items-center gap-2">
              {hasChanges ? (
                <Badge variant="secondary">
                  {isNewFile ? (
                    <span className="font-semibold">Ny fil</span>
                  ) : (
                    <>
                      {summary.added > 0 && `${summary.added} tillagda`}
                      {summary.added > 0 && summary.removed > 0 && ', '}
                      {summary.removed > 0 && `${summary.removed} borttagna`}
                      {summary.modified > 0 && `, ${summary.modified} ändrade`}
                    </>
                  )}
                </Badge>
              ) : (
                <Badge variant="outline">Inga ändringar</Badge>
              )}
              {showUploadButton && onUpload && (
                <Button size="sm" onClick={onUpload}>
                  Ladda upp
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {hasChanges && (
          <CardContent>
            {isNewFile && processNode && (
              <div className="mb-3 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">
                  ✨ Ny process-fil
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  <div className="font-medium">{processNode.nodeName || processNode.bpmnElementId}</div>
                  {processNode.metadata.callActivitiesCount !== undefined && (
                    <div>Call activities: {processNode.metadata.callActivitiesCount}</div>
                  )}
                  {processNode.metadata.tasksCount !== undefined && (
                    <div>Tasks: {processNode.metadata.tasksCount}</div>
                  )}
                  <div className="mt-1 text-muted-foreground">
                    Totalt {summary.added} noder i den nya processen
                  </div>
                </div>
              </div>
            )}
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  Visa detaljer
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {otherAddedNodes.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                      {isNewFile ? 'Noder i processen' : 'Tillagda'} ({otherAddedNodes.length})
                    </div>
                    <div className="space-y-2">
                      {otherAddedNodes.slice(0, 10).map((node) => (
                        <div key={node.nodeKey} className="border-l-2 border-green-500 pl-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            {getDiffTypeIcon('added')}
                            <span>{node.nodeName || node.bpmnElementId}</span>
                            <Badge variant="outline" className="text-xs">
                              {node.nodeType}
                            </Badge>
                          </div>
                          {node.metadata.calledElement && (
                            <div className="ml-6 text-xs text-muted-foreground">
                              Anropar: <span className="font-medium">{node.metadata.calledElement}</span>
                            </div>
                          )}
                          {node.metadata.processId && (
                            <div className="ml-6 text-xs text-muted-foreground">
                              Process ID: <span className="font-medium">{node.metadata.processId}</span>
                            </div>
                          )}
                          {(node.metadata.callActivitiesCount !== undefined || node.metadata.tasksCount !== undefined) && (
                            <div className="ml-6 text-xs text-muted-foreground">
                              {node.metadata.callActivitiesCount !== undefined && (
                                <span>Call activities: {node.metadata.callActivitiesCount}</span>
                              )}
                              {node.metadata.callActivitiesCount !== undefined && node.metadata.tasksCount !== undefined && ', '}
                              {node.metadata.tasksCount !== undefined && (
                                <span>Tasks: {node.metadata.tasksCount}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {otherAddedNodes.length > 10 && (
                        <div className="text-xs text-muted-foreground">
                          ...och {otherAddedNodes.length - 10} fler
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {summary.removed > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                      Borttagna ({summary.removed})
                    </div>
                    <div className="space-y-2">
                      {diffResult.removed.slice(0, 10).map((node) => (
                        <div key={node.nodeKey} className="border-l-2 border-red-500 pl-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            {getDiffTypeIcon('removed')}
                            <span>{node.nodeName || node.bpmnElementId}</span>
                            <Badge variant="outline" className="text-xs">
                              {node.nodeType}
                            </Badge>
                          </div>
                          {node.metadata.calledElement && (
                            <div className="ml-6 text-xs text-muted-foreground">
                              Anropade: <span className="font-medium">{node.metadata.calledElement}</span>
                            </div>
                          )}
                          {node.metadata.processId && (
                            <div className="ml-6 text-xs text-muted-foreground">
                              Process ID: <span className="font-medium">{node.metadata.processId}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {diffResult.removed.length > 10 && (
                        <div className="text-xs text-muted-foreground">
                          ...och {diffResult.removed.length - 10} fler
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {summary.modified > 0 && (
                  <div>
                    <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                      Ändrade ({summary.modified})
                    </div>
                    <div className="space-y-2">
                      {diffResult.modified.slice(0, 10).map(({ node, oldNode, changes }) => (
                        <div key={node.nodeKey} className="border-l-2 border-yellow-500 pl-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            {getDiffTypeIcon('modified')}
                            <span>{node.nodeName || node.bpmnElementId}</span>
                            <Badge variant="outline" className="text-xs">
                              {node.nodeType}
                            </Badge>
                          </div>
                          <div className="ml-6 space-y-1 text-xs">
                            {Object.entries(changes).map(([field, { old: oldValue, new: newValue }]) => (
                              <div key={field} className="text-muted-foreground">
                                <span className="font-medium">{field}:</span>{' '}
                                <span className="line-through text-red-600 dark:text-red-400">
                                  {formatChangeValue(oldValue)}
                                </span>
                                {' → '}
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  {formatChangeValue(newValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {diffResult.modified.length > 10 && (
                        <div className="text-xs text-muted-foreground">
                          ...och {diffResult.modified.length - 10} fler
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{fileName}</CardTitle>
          <div className="flex items-center gap-2">
            {getDiffTypeBadge('added')}
            {getDiffTypeBadge('removed')}
            {getDiffTypeBadge('modified')}
            {showUploadButton && onUpload && (
              <Button size="sm" onClick={onUpload}>
                Ladda upp
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {summary.added > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Tillagda noder ({summary.added})</div>
              <div className="space-y-3">
                {diffResult.added.map((node) => (
                  <div key={node.nodeKey} className="border-l-2 border-green-500 pl-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {getDiffTypeIcon('added')}
                      <span>{node.nodeName || node.bpmnElementId}</span>
                      <Badge variant="outline" className="text-xs">
                        {node.nodeType}
                      </Badge>
                    </div>
                    <div className="ml-6 space-y-0.5 text-sm text-muted-foreground">
                      {node.metadata.calledElement && (
                        <div>
                          Anropar: <span className="font-medium text-foreground">{node.metadata.calledElement}</span>
                        </div>
                      )}
                      {node.metadata.processId && (
                        <div>
                          Process ID: <span className="font-medium text-foreground">{node.metadata.processId}</span>
                        </div>
                      )}
                      {(node.metadata.callActivitiesCount !== undefined || node.metadata.tasksCount !== undefined) && (
                        <div>
                          {node.metadata.callActivitiesCount !== undefined && (
                            <span>Call activities: {node.metadata.callActivitiesCount}</span>
                          )}
                          {node.metadata.callActivitiesCount !== undefined && node.metadata.tasksCount !== undefined && ', '}
                          {node.metadata.tasksCount !== undefined && (
                            <span>Tasks: {node.metadata.tasksCount}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {summary.removed > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Borttagna noder ({summary.removed})</div>
              <div className="space-y-3">
                {diffResult.removed.map((node) => (
                  <div key={node.nodeKey} className="border-l-2 border-red-500 pl-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {getDiffTypeIcon('removed')}
                      <span>{node.nodeName || node.bpmnElementId}</span>
                      <Badge variant="outline" className="text-xs">
                        {node.nodeType}
                      </Badge>
                    </div>
                    <div className="ml-6 space-y-0.5 text-sm text-muted-foreground">
                      {node.metadata.calledElement && (
                        <div>
                          Anropade: <span className="font-medium text-foreground">{node.metadata.calledElement}</span>
                        </div>
                      )}
                      {node.metadata.processId && (
                        <div>
                          Process ID: <span className="font-medium text-foreground">{node.metadata.processId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {summary.modified > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Ändrade noder ({summary.modified})</div>
              <div className="space-y-3">
                {diffResult.modified.map(({ node, oldNode, changes }) => (
                  <div key={node.nodeKey} className="border-l-2 border-yellow-500 pl-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {getDiffTypeIcon('modified')}
                      <span>{node.nodeName || node.bpmnElementId}</span>
                      <Badge variant="outline" className="text-xs">
                        {node.nodeType}
                      </Badge>
                    </div>
                    <div className="ml-6 space-y-1.5 text-sm">
                      {Object.entries(changes).map(([field, { old: oldValue, new: newValue }]) => (
                        <div key={field} className="flex items-start gap-2">
                          <span className="font-medium text-muted-foreground min-w-[120px]">
                            {formatFieldName(field)}:
                          </span>
                          <div className="flex-1 space-x-2">
                            <span className="line-through text-red-600 dark:text-red-400">
                              {formatChangeValue(oldValue)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {formatChangeValue(newValue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!hasChanges && (
            <div className="text-sm text-muted-foreground">Inga ändringar</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
