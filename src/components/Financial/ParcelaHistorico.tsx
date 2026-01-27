import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, AlertTriangle, RotateCcw, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoricoItem {
  id: string;
  created_at: string;
  comentario: string;
  tipo: 'pagamento' | 'pagamento_parcial' | 'reabertura' | 'comentario';
  autor?: {
    full_name?: string;
    email?: string;
  };
}

interface ParcelaHistoricoProps {
  parcelaId: string;
}

export const ParcelaHistorico = ({ parcelaId }: ParcelaHistoricoProps) => {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistorico = async () => {
      try {
        const { data: comentarios, error } = await supabase
          .from('cliente_pagamento_comentarios')
          .select('*')
          .eq('parcela_id', parcelaId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Buscar perfis dos autores
        const userIds = [...new Set(comentarios?.map(c => c.user_id) || [])];
        const profiles: Record<string, any> = {};
        
        await Promise.all(
          userIds.map(async (userId) => {
            const { data } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', userId)
              .maybeSingle();
            if (data) profiles[userId] = data;
          })
        );

        const historicoFormatado: HistoricoItem[] = (comentarios || []).map((c) => {
          // Detectar tipo pelo conteúdo do comentário
          let tipo: HistoricoItem['tipo'] = 'comentario';
          const comentarioLower = c.comentario.toLowerCase();
          
          if (comentarioLower.includes('reaberto') || comentarioLower.includes('reabertura')) {
            tipo = 'reabertura';
          } else if (comentarioLower.includes('pagamento parcial') || comentarioLower.includes('saldo restante')) {
            tipo = 'pagamento_parcial';
          } else if (comentarioLower.includes('pagamento registrado') || comentarioLower.includes('baixa registrada')) {
            tipo = 'pagamento';
          }

          return {
            id: c.id,
            created_at: c.created_at,
            comentario: c.comentario,
            tipo,
            autor: profiles[c.user_id],
          };
        });

        setHistorico(historicoFormatado);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorico();
  }, [parcelaId]);

  const getIcon = (tipo: HistoricoItem['tipo']) => {
    switch (tipo) {
      case 'pagamento':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'pagamento_parcial':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'reabertura':
        return <RotateCcw className="w-4 h-4 text-blue-600" />;
      default:
        return <MessageCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getIconBg = (tipo: HistoricoItem['tipo']) => {
    switch (tipo) {
      case 'pagamento':
        return 'bg-green-100 dark:bg-green-950';
      case 'pagamento_parcial':
        return 'bg-amber-100 dark:bg-amber-950';
      case 'reabertura':
        return 'bg-blue-100 dark:bg-blue-950';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum registro de histórico encontrado.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="relative pl-6 space-y-0">
        {/* Linha vertical da timeline */}
        <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />
        
        {historico.map((item, index) => (
          <div key={item.id} className="relative pb-6 last:pb-0">
            {/* Ícone na timeline */}
            <div className={`absolute left-[-13px] w-6 h-6 rounded-full flex items-center justify-center ${getIconBg(item.tipo)}`}>
              {getIcon(item.tipo)}
            </div>
            
            {/* Conteúdo */}
            <div className="ml-4 p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
                {item.autor && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.autor.full_name || item.autor.email?.split('@')[0]}
                  </span>
                )}
              </div>
              <p className="text-sm">{item.comentario}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
