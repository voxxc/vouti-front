import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, CheckCheck, FolderPlus, Calendar } from 'lucide-react';
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
  onDeadlineNavigation?: (deadlineId: string) => void;
  onProtocoloNavigation?: (projectId: string, protocoloId: string) => void;
  onEtapaNavigation?: (etapaId: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  onProjectNavigation,
  onProcessoNavigation,
  onDeadlineNavigation,
  onProtocoloNavigation,
  onEtapaNavigation
}) => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(userId);
  const [shouldPing, setShouldPing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Animação de ping a cada 5 segundos quando há notificações não lidas
  useEffect(() => {
    if (unreadCount > 0 && !isOpen) {
      // Ping imediato
      setShouldPing(true);
      const resetTimeout = setTimeout(() => setShouldPing(false), 1000);

      // Ping a cada 5 segundos
      const interval = setInterval(() => {
        setShouldPing(true);
        setTimeout(() => setShouldPing(false), 1000);
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(resetTimeout);
      };
    } else {
      setShouldPing(false);
    }
  }, [unreadCount, isOpen]);

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
      case 'comment_mention':
        return <span className="text-lg">💬</span>;
      case 'project_added':
        return <FolderPlus className="h-5 w-5 text-green-600" />;
      case 'deadline_assigned':
      case 'deadline_tagged':
        return <Calendar className="h-5 w-5 text-orange-500" />;
      case 'conversation_transferred':
        return <span className="text-lg">🔄</span>;
      default:
        return <span className="text-lg">📢</span>;
    }
  };

  const getCommentMentionTarget = (notification: Notification): string => {
    const text = ((notification.title || '') + ' ' + (notification.content || '')).toLowerCase();
    if (text.includes('etapa')) return 'etapa';
    if (text.includes('protocolo')) return 'protocolo';
    if (text.includes('prazo')) return 'deadline';
    if (text.includes('processo')) return 'processo';
    if (text.includes('tarefa')) return 'task';
    if (text.includes('reunião') || text.includes('reuniao')) return 'reuniao';
    return 'project';
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Deadline notifications (assigned/tagged) → open deadline detail
    if ((notification.type === 'deadline_assigned' || notification.type === 'deadline_tagged') 
        && notification.related_task_id && onDeadlineNavigation) {
      onDeadlineNavigation(notification.related_task_id);
      setIsOpen(false);
      return;
    }

    // Comment mention notifications → route by title + content keywords
    if (notification.type === 'comment_mention') {
      const target = getCommentMentionTarget(notification);
      const entityId = notification.related_task_id;

      if (target === 'protocolo') {
        const resolveAndNavigate = async (projectId: string, protocoloId: string) => {
          if (onProtocoloNavigation) {
            onProtocoloNavigation(projectId, protocoloId);
          } else if (onProjectNavigation) {
            onProjectNavigation(`${projectId}?protocolo=${protocoloId}`);
          }
          setIsOpen(false);
        };

        if (notification.related_project_id && entityId) {
          await resolveAndNavigate(notification.related_project_id, entityId);
          return;
        }
        // If no project_id saved, try to look it up
        if (entityId) {
          try {
            const { data } = await supabase
              .from('project_protocolos')
              .select('project_id')
              .eq('id', entityId)
              .single();
            if (data?.project_id) {
              await resolveAndNavigate(data.project_id, entityId);
              return;
            }
          } catch { /* fall through */ }
        }
      }

      if (target === 'deadline' && entityId && onDeadlineNavigation) {
        onDeadlineNavigation(entityId);
        setIsOpen(false);
        return;
      }

      if (target === 'processo' && entityId && onProcessoNavigation) {
        onProcessoNavigation(entityId);
        setIsOpen(false);
        return;
      }

      if (target === 'etapa' && entityId) {
        if (onEtapaNavigation) {
          onEtapaNavigation(entityId);
          setIsOpen(false);
          return;
        }
        // Fallback: navigate to project with etapa param
        if (notification.related_project_id && onProjectNavigation) {
          onProjectNavigation(`${notification.related_project_id}?etapa=${entityId}`);
          setIsOpen(false);
          return;
        }
      }

      if (target === 'task' && notification.related_project_id && onProjectNavigation) {
        onProjectNavigation(notification.related_project_id);
        setIsOpen(false);
        return;
      }
    }

    // Fallback: se related_project_id é null mas related_task_id existe,
    // tentar resolver como protocolo ou etapa (compatibilidade com notificações antigas)
    if (!notification.related_project_id && notification.related_task_id) {
      try {
        // Tentar como protocolo
        if (onProtocoloNavigation) {
          const { data: protData } = await supabase
            .from('project_protocolos')
            .select('project_id')
            .eq('id', notification.related_task_id)
            .maybeSingle();
          if (protData?.project_id) {
            onProtocoloNavigation(protData.project_id, notification.related_task_id);
            setIsOpen(false);
            return;
          }
        }
        // Tentar como etapa
        if (onEtapaNavigation) {
          const { data: etapaData } = await supabase
            .from('project_protocolo_etapas')
            .select('id')
            .eq('id', notification.related_task_id)
            .maybeSingle();
          if (etapaData?.id) {
            onEtapaNavigation(etapaData.id);
            setIsOpen(false);
            return;
          }
        }
      } catch { /* fall through to default */ }
    }
    
    // Default: navigate to project
    if (notification.related_project_id && onProjectNavigation) {
      onProjectNavigation(notification.related_project_id);
    }
    
    setIsOpen(false);
  };

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          
          {/* Onda de ping animada */}
          {unreadCount > 0 && shouldPing && (
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="absolute h-4 w-4 rounded-full bg-red-500/60 animate-notification-ping" />
            </span>
          )}
          
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
