import * as React from 'react';
import { useAuth } from '../app/context/AuthContext';
import { useProfile } from '../app/context/ProfileContext';
import type { WorkspaceNotification } from '../shared/constants/workspaceNotifications';
import { workspaceNotificationsService } from '../services/workspace-notifications.service';
import { shouldReceiveWorkspaceNotification } from '../services/account-settings.service';

export const useWorkspaceNotifications = () => {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [notifications, setNotifications] = React.useState<WorkspaceNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = React.useState(false);

  const loadNotifications = React.useCallback(async () => {
    if (!activeProfile?.id || !user?.id) {
      setNotifications([]);
      return;
    }

    setIsLoadingNotifications(true);

    try {
      const data = await workspaceNotificationsService.list(activeProfile.id, user.id);
      setNotifications(
        data.filter((notification) =>
          shouldReceiveWorkspaceNotification(user.notificationPreferences, notification.type)
        )
      );
    } catch (error) {
      console.error('[useWorkspaceNotifications] Failed to load notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [activeProfile?.id, user?.id, user?.notificationPreferences]);

  React.useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  React.useEffect(() => {
    if (!activeProfile?.id || !user?.id) return;

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [activeProfile?.id, user?.id, loadNotifications]);

  const markAsRead = React.useCallback(
    async (notificationId: string) => {
      if (!activeProfile?.id || !user?.id) return;

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                isRead: true,
                readAt: notification.readAt ?? new Date().toISOString(),
              }
            : notification
        )
      );

      await workspaceNotificationsService.markAsRead(activeProfile.id, user.id, notificationId);
    },
    [activeProfile?.id, user?.id]
  );

  const markAllAsRead = React.useCallback(async () => {
    if (!activeProfile?.id || !user?.id) return;

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt ?? new Date().toISOString(),
      }))
    );

    await workspaceNotificationsService.markAllAsRead(activeProfile.id, user.id);
  }, [activeProfile?.id, user?.id]);

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.isRead).length,
    isLoadingNotifications,
    reloadNotifications: loadNotifications,
    markAsRead,
    markAllAsRead,
  };
};
