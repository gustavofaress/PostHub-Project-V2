import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WorkspaceModule } from '../../shared/constants/navigation';
import { normalizeWorkspaceModule, resolveWorkspaceRoute } from '../../shared/utils/workspaceRouting';

interface AppContextType {
  activeModule: WorkspaceModule;
  setActiveModule: (module: WorkspaceModule) => void;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = resolveWorkspaceRoute(location.pathname);
  const [activeModule, setLocalActiveModule] = React.useState<WorkspaceModule>(
    routeState.activeModule
  );

  // Keep state in sync with URL
  React.useEffect(() => {
    const nextRouteState = resolveWorkspaceRoute(location.pathname);

    setLocalActiveModule(nextRouteState.activeModule);

    if (nextRouteState.redirectTo) {
      navigate(nextRouteState.redirectTo, { replace: true });
    }
  }, [location.pathname, navigate]);

  const setActiveModule = (module: WorkspaceModule) => {
    const normalizedModule = normalizeWorkspaceModule(module);

    setLocalActiveModule(normalizedModule);

    // Only navigate if the current path doesn't already start with the module path
    if (!location.pathname.startsWith(`/workspace/${normalizedModule}`)) {
      navigate(`/workspace/${normalizedModule}`);
    }
  };

  return (
    <AppContext.Provider value={{ activeModule, setActiveModule }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
