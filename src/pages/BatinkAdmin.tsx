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
  full_name: string | null;
  empresa: string | null;
  cargo: string | null;
}

const BatinkAdmin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useBatinkAuth();
  const { toast } = useToast();
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

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
        .order('full_name');

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="container mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/batink/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Painel Admin</h1>
            <p className="text-xs text-muted-foreground">Gerencie colaboradores</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Collaborators List */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Colaboradores ({collaborators.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {collaborators.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum colaborador encontrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {collaborators.map((collab) => (
                      <button
                        key={collab.id}
                        onClick={() => setSelectedCollaborator(collab)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          selectedCollaborator?.id === collab.id
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-card border-border/50 hover:bg-muted/50'
                        }`}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                            {getInitials(collab.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {collab.full_name || 'Sem nome'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
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
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Detalhes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCollaborator ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="bg-primary/20 text-primary text-xl">
                        {getInitials(selectedCollaborator.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {selectedCollaborator.full_name || 'Sem nome'}
                      </h3>
                      <p className="text-muted-foreground">
                        {selectedCollaborator.cargo || 'Colaborador'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-border">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Empresa:</span>
                      <span className="text-foreground">
                        {selectedCollaborator.empresa || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cargo:</span>
                      <span className="text-foreground">
                        {selectedCollaborator.cargo || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Funcionalidade de histórico em desenvolvimento
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione um colaborador para ver detalhes</p>
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
