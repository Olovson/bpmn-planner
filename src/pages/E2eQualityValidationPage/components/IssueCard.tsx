/**
 * Component for displaying validation issues with copy functionality
 * 
 * Extracted from E2eQualityValidationPage.tsx
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check } from 'lucide-react';
import type { ValidationIssue } from '@/pages/E2eQualityValidationPage/types';

interface IssueCardProps {
  issue: ValidationIssue;
  icon: string;
  color: string;
}

export function IssueCard({ issue, icon, color }: IssueCardProps) {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleCopy = async () => {
    if (issue.exampleCode) {
      await navigator.clipboard.writeText(issue.exampleCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Alert variant={issue.severity === 'error' ? 'destructive' : 'default'}>
      <AlertDescription>
        <div className="flex items-start gap-2">
          <span className={color}>{icon}</span>
          <div className="flex-1">
            <div className="font-medium">[{issue.category}] {issue.message}</div>
            {issue.location && (
              <div className="text-xs text-muted-foreground mt-1">
                📍 {issue.location}
              </div>
            )}
            {issue.suggestion && (
              <div className="text-xs text-muted-foreground mt-1">
                💡 {issue.suggestion}
              </div>
            )}
            {issue.exampleCode && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCode(!showCode)}
                    className="h-7 text-xs"
                  >
                    {showCode ? 'Dölj' : 'Visa'} exempel-kod
                  </Button>
                  {showCode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 text-xs"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Kopierad!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Kopiera kod
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {showCode && (
                  <pre className="text-xs bg-muted p-2 rounded border overflow-x-auto">
                    <code>{issue.exampleCode}</code>
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

