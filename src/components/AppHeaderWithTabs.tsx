import { Button } from '@/components/ui/button';
import { LogOut, History, GitBranch, Network, List, FileText, Folder, Calendar, Settings, Palette, PlayCircle, BarChart3, FolderOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VersionIndicator } from '@/components/VersionIndicator';

export type ViewKey =
  | 'diagram'
  | 'tree'
  | 'listvy'
  | 'tests'
  | 'test-coverage'
  | 'e2e-quality-validation'
  | 'timeline'
  | 'configuration'
  | 'files'
  | 'styleguide'
  | 'bpmn-folder-diff';

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
  const navigate = useNavigate();
  const location = useLocation();
  const displayEmail = userEmail === 'seed-bot@local.test' ? null : userEmail;
  const handleTabChange = (v: string) => {
    if (v === 'tests' && !isTestsEnabled) return;
    onViewChange(v as ViewKey);
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-16 border-r border-border bg-card flex flex-col items-center justify-between py-4 z-40">
      {/* Top: brand + main navigation */}
      <div className="flex flex-col items-center gap-6">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          <img 
            src="/favicon.png" 
            alt="BPMN Planner" 
            className="h-8 w-8 object-contain"
          />
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
                onClick={() => handleTabChange('timeline')}
                aria-label="Timeline"
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  currentView === 'timeline'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Calendar className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Timeline / Planning</TooltipContent>
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
                onClick={() => handleTabChange('test-coverage')}
                aria-label="Test Coverage"
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  currentView === 'test-coverage'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Test Coverage Explorer</TooltipContent>
          </Tooltip>


          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => navigate('/configuration')}
                aria-label="Projektkonfiguration"
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  location.pathname === '/configuration' || location.hash === '#/configuration'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Settings className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Projektkonfiguration</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleTabChange('bpmn-folder-diff')}
                aria-label="Analysera Lokal Mapp"
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  currentView === 'bpmn-folder-diff'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Analysera Lokal Mapp</TooltipContent>
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

          {/* Separator */}
          <div className="w-8 h-px bg-border my-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => navigate('/styleguide')}
                aria-label="Styleguide"
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  location.pathname === '/styleguide' || location.hash === '#/styleguide'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Palette className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Styleguide</TooltipContent>
          </Tooltip>
        </nav>
      </div>

      {/* Bottom: user & actions */}
      <div className="flex flex-col items-center gap-3">
        {displayEmail && (
          <span className="text-[10px] text-muted-foreground rotate-90 whitespace-nowrap mb-1">
            {displayEmail}
          </span>
        )}
        {/* Version Indicator */}
        <div className="rotate-90 whitespace-nowrap mb-1">
          <VersionIndicator />
        </div>
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
