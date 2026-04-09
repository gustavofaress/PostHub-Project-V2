import * as React from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ModuleRenderer } from './components/ModuleRenderer';
import { TrialGuidedPopover } from '../onboarding/components/TrialGuidedPopover';

export const WorkspaceLayout = () => {
  return (
    <div className="min-h-screen bg-bg-main">
      <Sidebar />
      <div className="pl-[72px]">
        <Header />
        <main className="p-8">
          <ModuleRenderer />
        </main>
      </div>
      <TrialGuidedPopover />
    </div>
  );
};
