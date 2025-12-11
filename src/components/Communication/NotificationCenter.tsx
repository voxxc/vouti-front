import React from 'react';
import { Bell, CheckCheck, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface NotificationCenterProps {
  userId: string;
  onProjectNavigation?: (projectId: string) => void;
  onProcessoNavigation?: (processoId: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  onProjectNavigation,
  onProcessoNavigation
}) => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(userId);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'project_update':
        return <span className="text-lg">📋</span>;
      case 'task_moved':
        return <span className="text-lg">🔄</span>;
      case 'task_created':
        return <span className="text-lg">➕</span>;
      case 'mention':
        return <span className="text-lg">👤</span>;
      case 'comment_added':
        return <span className="text-lg">💬</span>;
      case 'andamento_processo':
        return <Scale className="h-5 w-5 text-primary" />;
      default:
        return <span className="text-lg">📢</span>;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navegacao condicional baseada no tipo
    if (notification.type === 'andamento_processo' && notification.related_project_id && onProcessoNavigation) {
      onProcessoNavigation(notification.related_project_id);
    } else if (notification.related_project_id && onProjectNavigation) {
      onProjectNavigation(notification.related_project_id);
    }
  };

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Notificacoes</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-6"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Marcar todas
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma notificacao
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors border-l-2 ${
                        notification.is_read 
                          ? 'border-l-transparent' 
                          : 'border-l-primary bg-primary/5'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium truncate">
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(notification.created_at), "dd/MM/yy 'as' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
