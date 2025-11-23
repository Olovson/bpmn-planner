import { Button } from '@/components/ui/button';
import { LogOut, History, GitBranch, Network, List, FileText, Folder } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react';

export type ViewKey = 'diagram' | 'tree' | 'listvy' | 'tests' | 'files';

interface AppHeaderWithTabsProps {
  userEmail?: string | null;
  currentView: ViewKey;
  onViewChange: (value: ViewKey) => void;
  onOpenVersions: () => void;
  onSignOut: () => void;
  isTestsEnabled?: boolean;
}

export const AppHeaderWithTabs: React.FC<AppHeaderWithTabsProps> = ({
  userEmail,
  currentView,
  onViewChange,
  onOpenVersions,
  onSignOut,
  isTestsEnabled = true,
}) => {
  const handleTabChange = (v: string) => {
    if (v === 'tests' && !isTestsEnabled) return;
    onViewChange(v as ViewKey);
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-16 border-r border-border bg-card flex flex-col items-center justify-between py-4 z-40">
      {/* Top: brand + main navigation */}
      <div className="flex flex-col items-center gap-6">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          BPMN
        </div>
        <nav className="flex flex-col items-center gap-3" aria-label="Huvudnavigering">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleTabChange('diagram')}
                aria-label="BPMN-diagram"
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  currentView === 'diagram'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <GitBranch className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">BPMN-diagram</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleTabChange('tree')}
                aria-label="Strukturträd"
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  currentView === 'tree'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Network className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Strukturträd</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleTabChange('listvy')}
                aria-label="Listvy"
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  currentView === 'listvy'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Listvy</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleTabChange('tests')}
                aria-label="Tests"
                disabled={!isTestsEnabled}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  !isTestsEnabled
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : currentView === 'tests'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <FileText className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isTestsEnabled ? 'Tests' : 'Tests ej tillgängliga ännu'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleTabChange('files')}
                aria-label="Filer"
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  currentView === 'files'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Folder className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Filer</TooltipContent>
          </Tooltip>
        </nav>
      </div>

      {/* Bottom: user & actions */}
      <div className="flex flex-col items-center gap-3">
        {userEmail && (
          <span className="text-[10px] text-muted-foreground rotate-90 whitespace-nowrap mb-1">
            {userEmail}
          </span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onOpenVersions}
              aria-label="Versioner"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <History className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Versioner</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Logga ut"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Logga ut</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
};
