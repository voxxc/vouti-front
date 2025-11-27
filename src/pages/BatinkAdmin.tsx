import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useBatinkAuth } from '@/contexts/BatinkAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Collaborator {
  id: string;
  user_id: string;
  nome_completo: string | null;
  apelido: string | null;
  empresa: string | null;
  cargo: string | null;
}

interface TimeEntry {
  id: string;
  entry_type: string;
  entry_date: string;
  entry_time: string;
}

const entryTypeLabels: Record<string, { label: string; color: string }> = {
  entrada: { label: 'Entrada', color: 'text-green-400' },
  pausa: { label: 'Pausa', color: 'text-yellow-400' },
  almoco: { label: 'Almoço', color: 'text-blue-400' },
  retorno_almoco: { label: 'Retorno', color: 'text-cyan-400' },
  saida: { label: 'Saída', color: 'text-orange-400' },
};

const BatinkAdmin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useBatinkAuth();
  const { toast } = useToast();
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [collaboratorEntries, setCollaboratorEntries] = useState<TimeEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/batink/dashboard');
      return;
    }

    if (isAdmin) {
      fetchCollaborators();
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('batink_profiles')
        .select('*')
        .order('nome_completo');

      if (error) throw error;
      setCollaborators(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar colaboradores',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaboratorEntries = async (userId: string) => {
    setEntriesLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('batink_time_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('entry_date', today)
        .order('entry_time', { ascending: false });

      if (error) throw error;
      setCollaboratorEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleSelectCollaborator = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    fetchCollaboratorEntries(collaborator.user_id);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#1a1625] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9333EA]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1625]">
      {/* Header */}
      <header className="bg-[#2d2640]/80 backdrop-blur-md border-b border-white/10 px-4 py-4 sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/batink/dashboard')}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-white">Painel Admin</h1>
            <p className="text-xs text-white/60">Gerencie colaboradores</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Collaborators List */}
          <Card className="bg-[#2d2640]/80 backdrop-blur-md border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#9333EA]" />
                Colaboradores ({collaborators.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {collaborators.length === 0 ? (
                  <div className="text-center py-8 text-white/60">
                    Nenhum colaborador encontrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {collaborators.map((collab) => (
                      <button
                        key={collab.id}
                        onClick={() => handleSelectCollaborator(collab)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          selectedCollaborator?.id === collab.id
                            ? 'bg-[#9333EA]/20 border-[#9333EA]/40'
                            : 'bg-[#1a1625] border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-[#9333EA]/20 text-[#9333EA] text-sm">
                            {getInitials(collab.nome_completo)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {collab.apelido || collab.nome_completo || 'Sem nome'}
                          </p>
                          <p className="text-sm text-white/60 truncate">
                            {collab.cargo || 'Colaborador'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Collaborator Details */}
          <Card className="bg-[#2d2640]/80 backdrop-blur-md border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#9333EA]" />
                Registros de Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCollaborator ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-[#9333EA]/10 border border-[#9333EA]/20">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-[#9333EA]/20 text-[#9333EA] text-lg">
                        {getInitials(selectedCollaborator.nome_completo)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-white">
                        {selectedCollaborator.apelido || selectedCollaborator.nome_completo || 'Sem nome'}
                      </h3>
                      {selectedCollaborator.nome_completo && selectedCollaborator.apelido && (
                        <p className="text-sm text-white/60">
                          {selectedCollaborator.nome_completo}
                        </p>
                      )}
                    </div>
                  </div>

                  {entriesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#9333EA]" />
                    </div>
                  ) : collaboratorEntries.length === 0 ? (
                    <div className="text-center py-8 text-white/60">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum registro hoje</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {collaboratorEntries.map((entry) => {
                        const config = entryTypeLabels[entry.entry_type] || {
                          label: entry.entry_type,
                          color: 'text-white',
                        };
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-[#1a1625] border border-white/10"
                          >
                            <span className={`font-medium ${config.color}`}>
                              {config.label}
                            </span>
                            <span className="text-white/60 tabular-nums">
                              {entry.entry_time?.substring(0, 5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-white/60">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione um colaborador para ver registros</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BatinkAdmin;
