import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WorkspaceModule } from '../../shared/constants/navigation';

interface AppContextType {
  activeModule: WorkspaceModule;
  setActiveModule: (module: WorkspaceModule) => void;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active module from URL
  const pathParts = location.pathname.split('/');
  const currentPathModule = pathParts[2] as WorkspaceModule | undefined;
  const currentModule = currentPathModule === 'scripts' ? 'ideas' : currentPathModule || 'dashboard';

  const [activeModule, setLocalActiveModule] = React.useState<WorkspaceModule>(currentModule);

  // Keep state in sync with URL
  React.useEffect(() => {
    if (location.pathname === '/workspace' || location.pathname === '/workspace/') {
      navigate('/workspace/dashboard', { replace: true });
    } else if (location.pathname.startsWith('/workspace/scripts')) {
      setLocalActiveModule('ideas');
      navigate('/workspace/ideas', { replace: true });
    } else if (pathParts[1] === 'workspace' && pathParts[2]) {
      setLocalActiveModule(pathParts[2] as WorkspaceModule);
    }
  }, [location.pathname, navigate]);

  const setActiveModule = (module: WorkspaceModule) => {
    setLocalActiveModule(module);
    // Only navigate if the current path doesn't already start with the module path
    if (!location.pathname.startsWith(`/workspace/${module}`)) {
      navigate(`/workspace/${module}`);
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
