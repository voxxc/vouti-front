import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, User, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo: string | null;
  status: string;
  prioridade: string;
  validado: string;
  uf: string | null;
  responsavel_id: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const TIPOS_CONFIG = {
  'empresario': { label: 'Empresário', color: 'bg-blue-500 text-white' },
  'agricultor': { label: 'Agricultor', color: 'bg-green-500 text-white' },
  'pecuarista': { label: 'Pecuarista', color: 'bg-orange-500 text-white' },
  'produtor rural': { label: 'Produtor Rural', color: 'bg-amber-600 text-white' },
};

const STATUS_CONFIG = {
  'captacao': { label: 'Captação', color: 'bg-gray-500 text-white' },
  'agendado': { label: 'Agendado', color: 'bg-blue-600 text-white' },
  'agendar': { label: 'Agendar', color: 'bg-cyan-500 text-white' },
  'proposta enviada': { label: 'Proposta Enviada', color: 'bg-purple-500 text-white' },
  '1a tentativa de contato': { label: '1ª Tentativa', color: 'bg-yellow-500 text-white' },
  '2a tentativa de contato': { label: '2ª Tentativa', color: 'bg-yellow-600 text-white' },
  '3a tentativa de contato': { label: '3ª Tentativa', color: 'bg-orange-500 text-white' },
  '4a tentativa de contato': { label: '4ª Tentativa', color: 'bg-red-500 text-white' },
  'reagendar': { label: 'Reagendar', color: 'bg-amber-500 text-white' },
  '1a reuniao realizada': { label: '1ª Reunião', color: 'bg-indigo-500 text-white' },
  '2a reuniao realizada': { label: '2ª Reunião', color: 'bg-indigo-600 text-white' },
  'sucesso do cliente': { label: 'Sucesso', color: 'bg-green-600 text-white' },
  'negociou com banco': { label: 'Negociou Banco', color: 'bg-teal-500 text-white' },
  'ja tem advogado': { label: 'Tem Advogado', color: 'bg-gray-600 text-white' },
  'desqualificado': { label: 'Desqualificado', color: 'bg-red-600 text-white' },
};

const PRIORIDADE_CONFIG = {
  'prioridade': { label: 'PRIORIDADE', color: 'bg-red-600 text-white' },
  '0 a 100k': { label: '0 a 100k', color: 'bg-emerald-500 text-white' },
  '101k a 300k': { label: '101k a 300k', color: 'bg-orange-400 text-white' },
  '301k a 500k': { label: '301k a 500k', color: 'bg-amber-500 text-white' },
  '501k a 1M': { label: '501k a 1M', color: 'bg-purple-500 text-white' },
  'mais de 1M': { label: 'Mais de 1M', color: 'bg-pink-600 text-white' },
  'a definir': { label: 'A Definir', color: 'bg-gray-400 text-white' },
};

const VALIDADO_CONFIG = {
  'validado': { label: 'Validado', color: 'bg-green-500 text-white' },
  'em contato': { label: 'Em Contato', color: 'bg-blue-500 text-white' },
  'sem contato': { label: 'Sem Contato', color: 'bg-gray-500 text-white' },
  'a definir': { label: 'A Definir', color: 'bg-gray-400 text-white' },
};

export default function CaptacaoSheet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchProfiles();
    }
  }, [user]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads_captacao')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Erro ao carregar leads",
        description: "Não foi possível carregar os leads de captação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const updateLead = async (leadId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('leads_captacao')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, [field]: value } : lead
      ));

      toast({
        title: "Lead atualizado",
        description: "As informações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o lead.",
        variant: "destructive",
      });
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.telefone?.includes(searchTerm)
  );

  const getResponsavelInfo = (responsavelId: string | null) => {
    if (!responsavelId) return null;
    return profiles.find(p => p.user_id === responsavelId);
  };

  const getDDDtoUF = (telefone: string | null) => {
    if (!telefone) return null;
    const ddd = telefone.replace(/\D/g, '').substring(0, 2);
    const dddMap: Record<string, string> = {
      '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
      '21': 'RJ', '22': 'RJ', '24': 'RJ',
      '27': 'ES', '28': 'ES',
      '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '37': 'MG', '38': 'MG',
      '41': 'PR', '42': 'PR', '43': 'PR', '44': 'PR', '45': 'PR', '46': 'PR',
      '47': 'SC', '48': 'SC', '49': 'SC',
      '51': 'RS', '53': 'RS', '54': 'RS', '55': 'RS',
      '61': 'DF',
      '62': 'GO', '64': 'GO',
      '63': 'TO',
      '65': 'MT', '66': 'MT',
      '67': 'MS',
      '68': 'AC',
      '69': 'RO',
      '71': 'BA', '73': 'BA', '74': 'BA', '75': 'BA', '77': 'BA',
      '79': 'SE',
      '81': 'PE', '87': 'PE',
      '82': 'AL',
      '83': 'PB',
      '84': 'RN',
      '85': 'CE', '88': 'CE',
      '86': 'PI', '89': 'PI',
      '91': 'PA', '93': 'PA', '94': 'PA',
      '92': 'AM', '97': 'AM',
      '95': 'RR',
      '96': 'AP',
      '98': 'MA', '99': 'MA',
    };
    return dddMap[ddd] || null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar leads por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredLeads.length} leads encontrados
        </div>
      </div>

      <ScrollArea className="h-[600px] w-full border rounded-lg">
        <div className="min-w-[1800px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px] sticky left-0 bg-muted/50 z-10">Elemento</TableHead>
                <TableHead className="w-[120px]">Responsável</TableHead>
                <TableHead className="w-[120px]">Data</TableHead>
                <TableHead className="w-[150px]">Tipo</TableHead>
                <TableHead className="w-[180px]">Status</TableHead>
                <TableHead className="w-[150px]">Prioridade</TableHead>
                <TableHead className="w-[140px]">Validado</TableHead>
                <TableHead className="w-[80px]">UF</TableHead>
                <TableHead className="w-[250px]">E-mail</TableHead>
                <TableHead className="w-[150px]">Telefone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const responsavel = getResponsavelInfo(lead.responsavel_id);
                  const ufFromDDD = getDDDtoUF(lead.telefone);

                  return (
                    <TableRow key={lead.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium sticky left-0 bg-background">
                        {lead.nome}
                      </TableCell>
                      
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              {responsavel ? (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={responsavel.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {responsavel.full_name?.substring(0, 2).toUpperCase() || 'US'}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[250px]" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar usuário..." />
                              <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                              <CommandGroup>
                                {profiles.map((profile) => (
                                  <CommandItem
                                    key={profile.user_id}
                                    onSelect={() => updateLead(lead.id, 'responsavel_id', profile.user_id)}
                                    className="flex items-center gap-2"
                                  >
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={profile.avatar_url || undefined} />
                                      <AvatarFallback>
                                        {profile.full_name?.substring(0, 2).toUpperCase() || 'US'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span>{profile.full_name || 'Sem nome'}</span>
                                    {lead.responsavel_id === profile.user_id && (
                                      <Check className="ml-auto h-4 w-4" />
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>

                      <TableCell className="text-sm">
                        {format(new Date(lead.created_at), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>

                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              {lead.tipo ? (
                                <Badge className={TIPOS_CONFIG[lead.tipo as keyof typeof TIPOS_CONFIG]?.color || 'bg-gray-500'}>
                                  {TIPOS_CONFIG[lead.tipo as keyof typeof TIPOS_CONFIG]?.label || lead.tipo}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-2 w-[200px]" align="start">
                            <div className="space-y-1">
                              {Object.entries(TIPOS_CONFIG).map(([key, config]) => (
                                <Button
                                  key={key}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => updateLead(lead.id, 'tipo', key)}
                                >
                                  <Badge className={config.color}>{config.label}</Badge>
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>

                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <Badge className={STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-500'}>
                                {STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG]?.label || lead.status}
                              </Badge>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-2 w-[220px] max-h-[400px] overflow-y-auto" align="start">
                            <div className="space-y-1">
                              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <Button
                                  key={key}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => updateLead(lead.id, 'status', key)}
                                >
                                  <Badge className={config.color}>{config.label}</Badge>
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>

                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <Badge className={PRIORIDADE_CONFIG[lead.prioridade as keyof typeof PRIORIDADE_CONFIG]?.color || 'bg-gray-500'}>
                                {PRIORIDADE_CONFIG[lead.prioridade as keyof typeof PRIORIDADE_CONFIG]?.label || lead.prioridade}
                              </Badge>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-2 w-[200px]" align="start">
                            <div className="space-y-1">
                              {Object.entries(PRIORIDADE_CONFIG).map(([key, config]) => (
                                <Button
                                  key={key}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => updateLead(lead.id, 'prioridade', key)}
                                >
                                  <Badge className={config.color}>{config.label}</Badge>
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>

                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <Badge className={VALIDADO_CONFIG[lead.validado as keyof typeof VALIDADO_CONFIG]?.color || 'bg-gray-500'}>
                                {VALIDADO_CONFIG[lead.validado as keyof typeof VALIDADO_CONFIG]?.label || lead.validado}
                              </Badge>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-2 w-[180px]" align="start">
                            <div className="space-y-1">
                              {Object.entries(VALIDADO_CONFIG).map(([key, config]) => (
                                <Button
                                  key={key}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => updateLead(lead.id, 'validado', key)}
                                >
                                  <Badge className={config.color}>{config.label}</Badge>
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>

                      <TableCell className="text-sm font-medium">
                        {lead.uf || ufFromDDD || '-'}
                      </TableCell>

                      <TableCell className="text-sm">
                        {lead.email || '-'}
                      </TableCell>

                      <TableCell className="text-sm">
                        {lead.telefone || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
