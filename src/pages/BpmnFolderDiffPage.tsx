/**
 * BPMN Folder Diff Page
 * 
 * Page for analyzing diffs of BPMN files in a local folder
 */

import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { FolderDiffAnalysis } from '@/components/FolderDiffAnalysis';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function BpmnFolderDiffPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen bg-background">
      <AppHeaderWithTabs
        userEmail={user?.email}
        currentView="files"
        onViewChange={(v) => {
          if (v === 'files') navigate('/files');
          else if (v === 'diagram') navigate('/');
        }}
        onOpenVersions={() => {}}
        onSignOut={signOut}
      />

      <main className="flex-1 ml-16 overflow-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Diff-analys av Lokal Mapp</h1>
            <p className="text-muted-foreground mt-2">
              Analysera diffen för BPMN-filer i en lokal mapp utan att ladda upp dem
            </p>
          </div>

          <FolderDiffAnalysis />
        </div>
      </main>
    </div>
  );
}
