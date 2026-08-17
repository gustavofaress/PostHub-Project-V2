import * as React from 'react';
import { socialAnalyticsService } from '../services/social-analytics.service';
import type { SocialConnection } from '../types/social-analytics';

export const useSocialConnections = (profileId?: string | null) => {
  const [connections, setConnections] = React.useState<SocialConnection[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!profileId) {
      setConnections([]);
      setError(null);
      return;
    }

    setIsLoading(true);

    try {
      const data = await socialAnalyticsService.listConnections(profileId);
      setConnections(data);
      setError(null);
    } catch (loadError) {
      console.error('[useSocialConnections] Error loading social connections:', loadError);
      setConnections([]);
      setError('Não foi possível carregar as conexões sociais deste perfil.');
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return {
    connections,
    isLoadingConnections: isLoading,
    connectionsError: error,
    reloadConnections: reload,
  };
};
