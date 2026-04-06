import * as React from 'react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { MobileWorkspaceLayout } from '../mobile/layout/MobileWorkspaceLayout';
import { useIsMobile } from '../mobile/hooks/useIsMobile';

export const ResponsiveWorkspaceLayout = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileWorkspaceLayout />;
  }

  return <WorkspaceLayout />;
};
