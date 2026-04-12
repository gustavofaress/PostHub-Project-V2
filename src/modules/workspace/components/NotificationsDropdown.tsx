import * as React from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceNotifications } from '../../../hooks/useWorkspaceNotifications';
import {
  buildWorkspaceNotificationUrl,
  formatWorkspaceNotificationTypeLabel,
  type WorkspaceNotification,
} from '../../../shared/constants/workspaceNotifications';
import { Avatar } from '../../../shared/components/Avatar';
import { Button } from '../../../shared/components/Button';
import { cn } from '../../../shared/utils/cn';

const formatNotificationTime = (value: string) => {
  try {
    return formatDistanceToNow(new Date(value), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return new Date(value).toLocaleString('pt-BR');
  }
};

const NotificationItem = ({
  notification,
  onClick,
}: {
  notification: WorkspaceNotification;
  onClick: (notification: WorkspaceNotification) => void;
}) => (
  <button
    type="button"
    onClick={() => onClick(notification)}
    className={cn(
      'w-full rounded-2xl border px-4 py-3 text-left transition-all hover:border-brand/20 hover:bg-brand/5',
      notification.isRead
        ? 'border-transparent bg-white'
        : 'border-brand/10 bg-brand/5 shadow-[0_0_0_1px_rgba(59,130,246,0.04)]'
    )}
  >
    <div className="flex items-start gap-3">
      <Avatar
        fallback={notification.actorName}
        size="sm"
        className={notification.isRead ? 'bg-gray-100 text-text-secondary' : 'bg-brand/10 text-brand'}
      />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              {formatWorkspaceNotificationTypeLabel(notification.type)}
            </span>
            {!notification.isRead ? <span className="h-2 w-2 rounded-full bg-brand" /> : null}
          </div>

          <span className="shrink-0 text-xs text-text-secondary">
            {formatNotificationTime(notification.createdAt)}
          </span>
        </div>

        <p className="text-sm font-semibold text-text-primary">{notification.entityTitle}</p>
        <p className="line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {notification.message}
        </p>
      </div>
    </div>
  </button>
);

export const NotificationsDropdown = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoadingNotifications,
    markAsRead,
    markAllAsRead,
  } = useWorkspaceNotifications();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = React.useCallback(
    (notification: WorkspaceNotification) => {
      setIsOpen(false);
      void markAsRead(notification.id);
      navigate(buildWorkspaceNotificationUrl(notification));
    },
    [markAsRead, navigate]
  );

  const visibleNotifications = notifications.slice(0, 12);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-text-primary"
        aria-label="Abrir central de notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : notifications.length > 0 ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand/70" />
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-2xl">
          <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-text-primary">Notificações</p>
                <p className="text-xs text-text-secondary">
                  {unreadCount > 0
                    ? `${unreadCount} atualização${unreadCount > 1 ? 'ões' : ''} pendente${unreadCount > 1 ? 's' : ''}`
                    : 'Tudo em dia por aqui'}
                </p>
              </div>

              {unreadCount > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="gap-2 px-2.5 py-1.5 text-xs"
                  onClick={() => void markAllAsRead()}
                >
                  <CheckCheck className="h-4 w-4" />
                  Marcar tudo
                </Button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto p-3">
            {isLoadingNotifications && notifications.length === 0 ? (
              <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 text-center text-sm text-text-secondary">
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
                Carregando atualizações do workspace...
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 px-6 text-center">
                <div className="rounded-full bg-brand/10 p-3 text-brand">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-text-primary">
                  Nenhuma notificação ainda
                </p>
                <p className="text-sm text-text-secondary">
                  Quando alguém mencionar você ou atualizar uma demanda vinculada, ela vai aparecer aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
